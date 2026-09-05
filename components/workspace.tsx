"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Copy,
  Download,
  GitCompareArrows,
  LoaderCircle,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Menu,
  ChevronRight,
  X,
} from "@/components/icons";

type Player = { name: string; number: number; position: string };

type Squad = { coach: string; formation: string; startingXI: Player[]; bench: Player[] };

type Scorer = { player: string; team: "home" | "away"; minute: number; type: "goal" | "penalty" | "own-goal" };

type Match = {
  id: string;
  iso: string;
  kickoffLocal: string;
  date: string;
  time: string;
  home: string;
  away: string;
  score: string;
  homeGoals: number;
  awayGoals: number;
  halfTime: { home: number; away: number };
  stage: string;
  round: string;
  gender: "Men" | "Women";
  venue: string;
  city: string;
  attendance: number;
  referee: string;
  statusCode: "FT" | "AET" | "PEN";
  scorers: Scorer[];
};

const positions = ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "AM", "RW", "ST", "LW"];

const squadNames: Record<string, string[]> = {
  Argentina: ["Gerónimo Rulli", "Marco Di Cesare", "Nicolás Otamendi", "Bruno Amione", "Julio Soler", "Ezequiel Fernández", "Kevin Zenón", "Thiago Almada", "Claudio Echeverri", "Julián Álvarez", "Giuliano Simeone"],
  Morocco: ["Munir Mohamedi", "Achraf Hakimi", "Jawad El Yamiq", "Mehdi Boukamir", "Zakaria El Ouahdi", "Oussama Targhalline", "Bilal El Khannouss", "Amir Richardson", "Eliesse Ben Seghir", "Soufiane Rahimi", "Ilias Akhomach"],
  Uzbekistan: ["Abduvohid Nematov", "Abdukodir Khusanov", "Umar Eshmurodov", "Husniddin Alikulov", "Diyor Kholmatov", "Abbosbek Fayzullaev", "Jasurbek Jaloliddinov", "Ruslanbek Jiyanov", "Khusayin Norchaev", "Alibek Davronov", "Ulugbek Khoshimov"],
  Spain: ["Arnau Tenas", "Juan Miranda", "Pau Cubarsí", "Eric García", "Marc Pubill", "Álex Baena", "Sergio Gómez", "Fermín López", "Juanlu Sánchez", "Abel Ruiz", "Samu Omorodion"],
  France: ["Guillaume Restes", "Kiliann Sildillia", "Castello Lukeba", "Chrislain Matsima", "Adrien Truffert", "Manu Koné", "Enzo Millot", "Désiré Doué", "Michael Olise", "Jean-Philippe Mateta", "Alexandre Lacazette"],
  "United States": ["Patrick Schulte", "John Tolkin", "Walker Zimmerman", "Miles Robinson", "Nathan Harriel", "Tanner Tessmann", "Djordje Mihailovic", "Paxten Aaronson", "Kevin Paredes", "Griffin Yow", "Duncan McGuire"],
  Egypt: ["Mohamed Sobhi", "Osama Faisal", "Mohamed Abdelmonem", "Ahmed Hany", "Karim El Debes", "Ahmed Nabil", "Ibrahim Adel", "Mahmoud Saber", "Akram Tawfik", "Mostafa Mohamed", "Ahmed Sayed"],
  "Dominican Republic": ["Xavier Valdez", "Peter González", "Nathan Bukele", "Óscar Ureña", "Ángel Montes de Oca", "Edison Azcona", "Jimmy Kaparos", "Junior Fernández", "Joao Urbáez", "Deiner Ramírez", "Alexander Cruz"],
  Japan: ["Ayaka Yamashita", "Risa Shimizu", "Saki Kumagai", "Moeka Minami", "Hikaru Kitagawa", "Fuka Nagano", "Yui Hasegawa", "Hinata Miyazawa", "Aoba Fujino", "Mina Tanaka", "Riko Ueki"],
  Canada: ["Kailen Sheridan", "Ashley Lawrence", "Vanessa Gilles", "Kadeisha Buchanan", "Jayde Riviere", "Quinn", "Jessie Fleming", "Julia Grosso", "Adriana Leon", "Cloé Lacasse", "Evelyne Viens"],
  "New Zealand": ["Victoria Esson", "Claudia Bunge", "Rebekah Stott", "Meikayla Moore", "Ali Riley", "Olivia Chance", "Betsy Hassett", "Malia Steinmetz", "Hannah Wilkinson", "Indiah-Paige Riley", "Milly Clegg"],
  Colombia: ["Catalina Pérez", "Manuela Vanegas", "Daniela Caracas", "Jorelyn Carabalí", "Carolina Arias", "Daniela Montoya", "Marcela Restrepo", "Leicy Santos", "Catalina Usme", "Mayra Ramírez", "Linda Caicedo"],
  Germany: ["Ann-Katrin Berger", "Sarai Linder", "Marina Hegering", "Kathrin Hendrich", "Felicitas Rauch", "Sara Däbritz", "Sydney Lohmann", "Jule Brand", "Klara Bühl", "Lea Schüller", "Giulia Gwinn"],
  Brazil: ["Lorena", "Antônia", "Lauren", "Tarciane", "Yasmim", "Ary Borges", "Adriana", "Kerolin", "Marta", "Gabi Portilho", "Ludmila"],
};

const coaches: Record<string, string> = {
  Argentina: "Javier Mascherano", Morocco: "Tarik Sektioui", Uzbekistan: "Timur Kapadze", Spain: "Santi Denia",
  France: "Thierry Henry", "United States": "Marko Mitrović", Egypt: "Rogério Micale", "Dominican Republic": "Ibai Gómez",
  Japan: "Futoshi Ikeda", Canada: "Andy Spence", "New Zealand": "Jitka Klimková", Colombia: "Ángelo Marsiglia",
  Germany: "Horst Hrubesch", Brazil: "Arthur Elias",
};

const squadFor = (team: string): Squad => {
  const names = squadNames[team] ?? Array.from({ length: 11 }, (_, index) => `${team} Player ${index + 1}`);
  return {
    coach: coaches[team] ?? "Unknown",
    formation: "4-3-3",
    startingXI: names.map((name, index) => ({ name, number: index + 1, position: positions[index] ?? "SUB" })),
    bench: [{ name: `${(names[0] ?? team).split(" ")[0]} reserve`, number: 12, position: "GK" }],
  };
};

const matches: Match[] = [
  { id: "oly-m-001", iso: "2024-07-24T15:00:00Z", kickoffLocal: "2024-07-24T17:00:00+02:00", date: "24 Jul", time: "15:00", home: "Argentina", away: "Morocco", score: "1–2", homeGoals: 1, awayGoals: 2, halfTime: { home: 0, away: 2 }, stage: "Group B", round: "Group stage · Matchday 1", gender: "Men", venue: "Stade Geoffroy-Guichard", city: "Saint-Étienne", attendance: 32104, referee: "Glenn Nyberg", statusCode: "FT", scorers: [{ player: "Soufiane Rahimi", team: "away", minute: 45, type: "penalty" }, { player: "Ilias Akhomach", team: "away", minute: 45, type: "goal" }, { player: "Cristian Medina", team: "home", minute: 90, type: "goal" }] },
  { id: "oly-m-002", iso: "2024-07-24T17:00:00Z", kickoffLocal: "2024-07-24T19:00:00+02:00", date: "24 Jul", time: "17:00", home: "Uzbekistan", away: "Spain", score: "1–2", homeGoals: 1, awayGoals: 2, halfTime: { home: 0, away: 1 }, stage: "Group C", round: "Group stage · Matchday 1", gender: "Men", venue: "Parc des Princes", city: "Paris", attendance: 41562, referee: "Facundo Tello", statusCode: "FT", scorers: [{ player: "Sergio Gómez", team: "away", minute: 24, type: "goal" }, { player: "Abbosbek Fayzullaev", team: "home", minute: 55, type: "goal" }, { player: "Juanlu Sánchez", team: "away", minute: 78, type: "goal" }] },
  { id: "oly-m-003", iso: "2024-07-24T19:00:00Z", kickoffLocal: "2024-07-24T21:00:00+02:00", date: "24 Jul", time: "19:00", home: "Egypt", away: "Dominican Republic", score: "1–0", homeGoals: 1, awayGoals: 0, halfTime: { home: 0, away: 0 }, stage: "Group C", round: "Group stage · Matchday 1", gender: "Men", venue: "Stade de Bordeaux", city: "Bordeaux", attendance: 23410, referee: "Ismail Elfath", statusCode: "FT", scorers: [{ player: "Ibrahim Adel", team: "home", minute: 62, type: "goal" }] },
  { id: "oly-m-004", iso: "2024-07-24T21:00:00Z", kickoffLocal: "2024-07-24T23:00:00+02:00", date: "24 Jul", time: "21:00", home: "France", away: "United States", score: "3–0", homeGoals: 3, awayGoals: 0, halfTime: { home: 1, away: 0 }, stage: "Group A", round: "Group stage · Matchday 1", gender: "Men", venue: "Stade de Marseille", city: "Marseille", attendance: 58412, referee: "Maurizio Mariani", statusCode: "FT", scorers: [{ player: "Alexandre Lacazette", team: "home", minute: 45, type: "goal" }, { player: "Jean-Philippe Mateta", team: "home", minute: 55, type: "goal" }, { player: "Michael Olise", team: "home", minute: 62, type: "goal" }] },
  { id: "oly-w-001", iso: "2024-07-25T17:00:00Z", kickoffLocal: "2024-07-25T19:00:00+02:00", date: "25 Jul", time: "17:00", home: "Spain", away: "Japan", score: "2–1", homeGoals: 2, awayGoals: 1, halfTime: { home: 1, away: 0 }, stage: "Group C", round: "Group stage · Matchday 1", gender: "Women", venue: "Stade de la Beaujoire", city: "Nantes", attendance: 19845, referee: "Tori Penso", statusCode: "FT", scorers: [{ player: "Alexia Putellas", team: "home", minute: 12, type: "goal" }, { player: "Mariona Caldentey", team: "home", minute: 68, type: "penalty" }, { player: "Mina Tanaka", team: "away", minute: 90, type: "goal" }] },
  { id: "oly-w-002", iso: "2024-07-25T19:00:00Z", kickoffLocal: "2024-07-25T21:00:00+02:00", date: "25 Jul", time: "19:00", home: "Canada", away: "New Zealand", score: "2–1", homeGoals: 2, awayGoals: 1, halfTime: { home: 1, away: 0 }, stage: "Group A", round: "Group stage · Matchday 1", gender: "Women", venue: "Stade Geoffroy-Guichard", city: "Saint-Étienne", attendance: 21033, referee: "Yoshimi Yamashita", statusCode: "FT", scorers: [{ player: "Cloé Lacasse", team: "home", minute: 13, type: "goal" }, { player: "Evelyne Viens", team: "home", minute: 79, type: "goal" }, { player: "Hannah Wilkinson", team: "away", minute: 88, type: "goal" }] },
  { id: "oly-w-003", iso: "2024-07-25T21:00:00Z", kickoffLocal: "2024-07-25T23:00:00+02:00", date: "25 Jul", time: "21:00", home: "France", away: "Colombia", score: "3–2", homeGoals: 3, awayGoals: 2, halfTime: { home: 2, away: 1 }, stage: "Group A", round: "Group stage · Matchday 1", gender: "Women", venue: "Stade de Lyon", city: "Décines-Charpieu", attendance: 34220, referee: "Edina Alves", statusCode: "FT", scorers: [{ player: "Marie-Antoinette Katoto", team: "home", minute: 16, type: "goal" }, { player: "Linda Caicedo", team: "away", minute: 33, type: "goal" }, { player: "Sakina Karchaoui", team: "home", minute: 44, type: "penalty" }, { player: "Mayra Ramírez", team: "away", minute: 61, type: "goal" }, { player: "Kadidiatou Diani", team: "home", minute: 84, type: "goal" }] },
  { id: "oly-m-029", iso: "2024-08-02T17:00:00Z", kickoffLocal: "2024-08-02T19:00:00+02:00", date: "02 Aug", time: "17:00", home: "Morocco", away: "United States", score: "4–0", homeGoals: 4, awayGoals: 0, halfTime: { home: 2, away: 0 }, stage: "Quarterfinal", round: "Knockout · Quarterfinal", gender: "Men", venue: "Parc des Princes", city: "Paris", attendance: 43012, referee: "Wilton Sampaio", statusCode: "FT", scorers: [{ player: "Soufiane Rahimi", team: "home", minute: 5, type: "goal" }, { player: "Soufiane Rahimi", team: "home", minute: 24, type: "penalty" }, { player: "Achraf Hakimi", team: "home", minute: 68, type: "goal" }, { player: "Mehdi Maouhoub", team: "home", minute: 90, type: "penalty" }] },
  { id: "oly-m-030", iso: "2024-08-02T21:00:00Z", kickoffLocal: "2024-08-02T23:00:00+02:00", date: "02 Aug", time: "21:00", home: "France", away: "Argentina", score: "1–0", homeGoals: 1, awayGoals: 0, halfTime: { home: 1, away: 0 }, stage: "Quarterfinal", round: "Knockout · Quarterfinal", gender: "Men", venue: "Stade de Bordeaux", city: "Bordeaux", attendance: 38109, referee: "Chris Beath", statusCode: "FT", scorers: [{ player: "Jean-Philippe Mateta", team: "home", minute: 5, type: "goal" }] },
  { id: "oly-w-024", iso: "2024-08-06T18:00:00Z", kickoffLocal: "2024-08-06T20:00:00+02:00", date: "06 Aug", time: "18:00", home: "United States", away: "Germany", score: "1–0", homeGoals: 1, awayGoals: 0, halfTime: { home: 0, away: 0 }, stage: "Semifinal", round: "Knockout · Semifinal", gender: "Women", venue: "Stade de Lyon", city: "Décines-Charpieu", attendance: 37533, referee: "Cheryl Foster", statusCode: "AET", scorers: [{ player: "Sophia Smith", team: "home", minute: 95, type: "goal" }] },
  { id: "oly-m-032", iso: "2024-08-09T16:00:00Z", kickoffLocal: "2024-08-09T18:00:00+02:00", date: "09 Aug", time: "16:00", home: "France", away: "Spain", score: "3–5", homeGoals: 3, awayGoals: 5, halfTime: { home: 1, away: 1 }, stage: "Final", round: "Knockout · Gold medal match", gender: "Men", venue: "Parc des Princes", city: "Paris", attendance: 44851, referee: "Ivan Barton", statusCode: "AET", scorers: [{ player: "Fermín López", team: "away", minute: 11, type: "goal" }, { player: "Enzo Millot", team: "home", minute: 18, type: "goal" }, { player: "Fermín López", team: "away", minute: 25, type: "goal" }, { player: "Alex Baena", team: "away", minute: 28, type: "goal" }, { player: "Maghnes Akliouche", team: "home", minute: 79, type: "goal" }, { player: "Jean-Philippe Mateta", team: "home", minute: 90, type: "penalty" }, { player: "Sergio Camello", team: "away", minute: 100, type: "goal" }, { player: "Sergio Camello", team: "away", minute: 120, type: "goal" }] },
  { id: "oly-w-026", iso: "2024-08-10T14:00:00Z", kickoffLocal: "2024-08-10T16:00:00+02:00", date: "10 Aug", time: "14:00", home: "Brazil", away: "United States", score: "0–1", homeGoals: 0, awayGoals: 1, halfTime: { home: 0, away: 0 }, stage: "Final", round: "Knockout · Gold medal match", gender: "Women", venue: "Parc des Princes", city: "Paris", attendance: 43813, referee: "Katia García", statusCode: "FT", scorers: [{ player: "Mallory Swanson", team: "away", minute: 57, type: "goal" }] },
];

const FLAGS: Record<string, string> = {
  Argentina: "ar", Morocco: "ma", Uzbekistan: "uz", Spain: "es", Egypt: "eg",
  "Dominican Republic": "do", France: "fr", "United States": "us", Japan: "jp",
  Canada: "ca", "New Zealand": "nz", Colombia: "co", Germany: "de", Brazil: "br",
};

const Flag = ({ team, className = "" }: { team: string; className?: string }) => {
  const code = FLAGS[team];
  if (!code) return <span aria-hidden="true" className={`inline-block h-3 w-4 shrink-0 rounded-sm bg-border ${className}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w20/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 2x`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={16}
      height={12}
      className={`h-3 w-4 shrink-0 rounded-sm object-cover ring-1 ring-border ${className}`}
    />
  );
};

const endpointFor = (match: Match) => `/v2/football/paris-2024/matches/${match.id}.json?kickoff=${match.iso}`;


const recordFor = (match: Match) => ({
  competition: {
    name: `Olympic Games Paris 2024 · Football ${match.gender}`,
    season: "2024",
    round: match.round,
  },
  venue: { name: match.venue, city: match.city },
  kickoff: match.kickoffLocal,
  status: match.statusCode,
  teams: { home: match.home, away: match.away },
  score: {
    home: match.homeGoals,
    away: match.awayGoals,
    halfTime: { home: match.halfTime.home, away: match.halfTime.away },
  },
  attendance: match.attendance,
  referee: match.referee,
  scorers: match.scorers.map((scorer) => ({
    player: scorer.player,
    team: scorer.team === "home" ? match.home : match.away,
    minute: scorer.minute,
    type: scorer.type,
  })),
  lineups: { home: squadFor(match.home), away: squadFor(match.away) },
  meta: { eventId: match.id, discipline: "Football", gender: match.gender, phase: match.stage, kickoffUtc: match.iso, endpoint: endpointFor(match) },
});

const compareRows = (match: Match) => [
  { field: "match_id", expected: match.id, actual: match.id, state: "pass" as const },
  { field: "kickoff", expected: match.kickoffLocal, actual: match.kickoffLocal, state: "pass" as const },
  { field: "status", expected: match.statusCode, actual: match.statusCode, state: "pass" as const },
  { field: "venue.name", expected: match.venue, actual: match.venue, state: "pass" as const },
  { field: "venue.city", expected: match.city, actual: match.city, state: "pass" as const },
  { field: "score", expected: `${match.homeGoals}-${match.awayGoals}`, actual: `${match.homeGoals}-${match.awayGoals}`, state: "pass" as const },
  { field: "score.halfTime", expected: `${match.halfTime.home}-${match.halfTime.away}`, actual: `${match.halfTime.home}-${match.halfTime.away}`, state: "pass" as const },
  { field: "scorers[]", expected: `${match.scorers.length} entries`, actual: `${match.scorers.length} entries`, state: "pass" as const },
  { field: "lineups", expected: "11 + bench", actual: "11 + bench", state: "pass" as const },
];


type Phase = "idle" | "loading" | "filtering" | "generating" | "complete" | "error";
type SortField = "kickoff" | "match" | "score" | "stage" | "gender";

const phaseProgress: Record<Phase, number | null> = { idle: null, loading: 30, filtering: 60, generating: 85, complete: 100, error: null };
const sortFieldLabels: Record<SortField, string> = { kickoff: "Kickoff", match: "Match", score: "Result", stage: "Stage", gender: "Gender" };

function SortHeader({ field, className, sort, onSort }: { field: SortField; className?: string; sort: { field: SortField; dir: "asc" | "desc" }; onSort: (sort: { field: SortField; dir: "asc" | "desc" }) => void }) {
  const active = sort.field === field;
  return (
    <button
      type="button"
      role="columnheader"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      onClick={() => onSort(active ? { field, dir: sort.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" })}
      className={`flex cursor-pointer items-center gap-1 text-left text-xs uppercase tracking-widest hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "font-semibold text-foreground" : "text-muted-foreground"} ${className}`}
    >
      {sortFieldLabels[field]}
      {active && (sort.dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />)}
    </button>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="relative flex min-h-10 items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-xs hover:border-muted-foreground focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
      <span className="text-muted-foreground">{label}</span>
      <select className="cursor-pointer appearance-none bg-transparent pr-5 font-medium text-foreground outline-none" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} className="bg-popover" value={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
    </label>
  );
}

export function Workspace() {
  const [phase, setPhase] = useState<Phase>("complete");
  const [gender, setGender] = useState("All");
  const [stage, setStage] = useState("All stages");
  const [team, setTeam] = useState("All teams");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ field: SortField; dir: "asc" | "desc" }>({ field: "kickoff", dir: "asc" });

  const [selectedId, setSelectedId] = useState("oly-m-001");
  const [inspector, setInspector] = useState<"endpoint" | "data" | "compare">("endpoint");
  const [toast, setToast] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.footyscores.test");
  const [comparing, setComparing] = useState(false);
  const [compared, setCompared] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [leftWidth, setLeftWidth] = useState(58);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeFilterCount = [gender !== "All", stage !== "All stages", team !== "All teams"].filter(Boolean).length;


  const timers = useRef<number[]>([]);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSheetOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setFiltersOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const min = rect.width * 0.28;
      const max = rect.width * 0.72;
      const x = Math.max(min, Math.min(event.clientX - rect.left, max));
      setLeftWidth((x / rect.width) * 100);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    timers.current.push(window.setTimeout(() => setToast(""), 2200));
  };

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const run = () => {
    clearTimers();
    setCompared(false);
    setPhase("loading");
    if (failNext) {
      timers.current.push(window.setTimeout(() => setPhase("error"), 1100));
      return;
    }
    timers.current.push(window.setTimeout(() => setPhase("filtering"), 900));
    timers.current.push(window.setTimeout(() => setPhase("generating"), 1700));
    timers.current.push(window.setTimeout(() => setPhase("complete"), 2900));
  };

  const reset = () => {
    clearTimers();
    setPhase("idle");
    setGender("All"); setStage("All stages"); setTeam("All teams"); setQuery(""); setSort({ field: "kickoff", dir: "asc" });
    setCompared(false); setComparing(false); setExportOpen(false);
    notify("Run reset");
  };

  const teams = useMemo(() => ["All teams", ...Array.from(new Set(matches.flatMap((match) => [match.home, match.away]))).sort()], []);

  const dataReady = phase === "complete";
  const running = phase === "loading" || phase === "filtering" || phase === "generating";
  const progress = phaseProgress[phase];

  const filtered = useMemo(() => {
    if (!dataReady) return [];
    const q = query.trim().toLowerCase();
    const rows = matches.filter((match) =>
      (gender === "All" || match.gender === gender) &&
      (stage === "All stages" || match.stage === stage) &&
      (team === "All teams" || match.home === team || match.away === team) &&
      (!q || [match.home, match.away, match.venue, match.id].some((field) => field.toLowerCase().includes(q))));
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sort.field) {
        case "kickoff": cmp = a.iso.localeCompare(b.iso); break;
        case "match": cmp = a.home.localeCompare(b.home) || a.away.localeCompare(b.away); break;
        case "score": cmp = (a.homeGoals + a.awayGoals) - (b.homeGoals + b.awayGoals); break;
        case "stage": cmp = a.stage.localeCompare(b.stage); break;
        case "gender": cmp = a.gender.localeCompare(b.gender); break;
      }
      return cmp * dir;
    });
  }, [dataReady, gender, stage, team, query, sort]);

  const selected = filtered.find((match) => match.id === selectedId) ?? filtered[0];
  const endpoint = selected ? endpointFor(selected) : "";

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(message);
    } catch {
      notify("Copy blocked by browser");
    }
  };

  const runCompare = () => {
    setComparing(true);
    setCompared(false);
    timers.current.push(window.setTimeout(() => { setComparing(false); setCompared(true); }, 1200));
  };

  const exportJson = (scope: "all" | "filtered" | "one") => {
    const rows = scope === "all" ? matches : scope === "filtered" ? filtered : selected ? [selected] : [];
    const payload = { competition: "paris-2024", sport: "football", schema: "example.json", order: `${sort.field} ${sort.dir}`, generatedCount: rows.length, matches: rows.map(recordFor) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `footyscores-paris2024-${scope}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    notify(`Exported ${rows.length} record${rows.length === 1 ? "" : "s"} as JSON`);
  };

  const startResize = (event: React.MouseEvent) => {
    event.preventDefault();
    dragging.current = true;
  };

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground antialiased selection:bg-signal-gold/30">
      <div className="mx-auto flex h-full max-w-workspace flex-col px-4 py-5 sm:px-6">
        <header className="animate-rise flex flex-nowrap items-center justify-between gap-3 border-b border-border pb-4 lg:gap-4 lg:pb-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid shrink-0 grid-cols-3 gap-1.5" aria-hidden="true">
              <span className="size-3.5 rounded-full border-2 border-signal-cyan" /><span className="size-3.5 rounded-full border-2 border-signal-gold" /><span className="size-3.5 rounded-full border-2 border-signal-red" />
              <span className="col-start-2 size-3.5 -translate-x-2 rounded-full border-2 border-signal-green" /><span className="size-3.5 -translate-x-2 rounded-full border-2 border-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-extrabold leading-none lg:text-lg">FOOTYSCORES · PARIS 2024 QA</h1>
              <p className="mt-1 truncate text-xs uppercase tracking-20 text-muted-foreground">Reference endpoint workspace · mock data</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex lg:w-auto">
            <label className="hidden min-h-10 items-center gap-2 rounded-md border border-border bg-panel px-3 text-xs text-muted-foreground lg:flex">
              <input type="checkbox" className="accent-signal-red" checked={failNext} onChange={(event) => setFailNext(event.target.checked)} />Simulate source failure
            </label>
            <Button variant="consoleOutline" size="sm" className="min-h-11 text-xs" onClick={reset}><RefreshCw />Reset</Button>
            <Button variant="console" size="sm" className="min-h-11 text-xs" onClick={run} disabled={running}>{running ? <LoaderCircle className="animate-spin" /> : <Play />}{running ? "Running…" : "Load & generate"}</Button>
          </div>
          <Button variant="consoleOutline" size="sm" className="min-h-11 px-3 lg:hidden" aria-label="Open workspace menu" aria-expanded={menuOpen} aria-controls="workspace-menu" onClick={() => setMenuOpen(true)}><Menu className="size-5" /></Button>

        </header>

        {menuOpen && (
          <div className="lg:hidden">
            <button aria-label="Close workspace menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 cursor-pointer bg-background/70 backdrop-blur-sm" />
            <div id="workspace-menu" role="dialog" aria-modal="true" aria-label="Workspace menu" className="animate-rise fixed inset-y-0 right-0 z-50 w-72 max-w-[80vw] border-l border-border bg-panel-raised p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <h3 className="font-display text-sm font-bold uppercase">Workspace</h3>
                <Button variant="ghost" size="sm" className="min-h-11 px-3 text-xs" onClick={() => setMenuOpen(false)}><X />Close</Button>
              </div>
              <div className="mt-4 grid gap-3">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-panel px-3 text-xs text-muted-foreground">
                  <input type="checkbox" className="accent-signal-red" checked={failNext} onChange={(event) => setFailNext(event.target.checked)} />Simulate source failure
                </label>
                <Button variant="consoleOutline" size="sm" className="min-h-11 w-full justify-start text-xs" onClick={() => { setMenuOpen(false); reset(); }}><RefreshCw />Reset</Button>
                <Button variant="console" size="sm" className="min-h-11 w-full justify-start text-xs" onClick={() => { setMenuOpen(false); run(); }} disabled={running}>{running ? <LoaderCircle className="animate-spin" /> : <Play />}{running ? "Running…" : "Load & generate"}</Button>
              </div>
            </div>
          </div>
        )}

        {running && typeof progress === "number" && (

          <div className="animate-rise mt-5" aria-label="Run progress">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><LoaderCircle className="size-3.5 animate-spin text-signal-gold" />{phase === "loading" ? "Retrieving schedule" : phase === "filtering" ? "Isolating football" : "Generating endpoints"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div className="animate-rise h-full rounded-full bg-gradient-to-r from-signal-cyan via-signal-gold to-signal-green transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 overflow-hidden" ref={splitRef}>
            <section className="animate-rise flex w-full min-w-0 flex-none flex-col overflow-hidden rounded-md border border-border bg-panel [animation-delay:120ms] md:w-[var(--left-pane)] md:rounded-l-md md:rounded-r-none md:border-r-0" style={{ ["--left-pane" as string]: `${leftWidth}%` } as React.CSSProperties}>

              <div className="border-b border-border px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-sm font-bold uppercase">Football match inventory</h2>
                      <span className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${phase === "error" ? "border-signal-red/30 text-signal-red" : dataReady ? "border-signal-green/30 text-signal-green" : "border-signal-cyan/30 text-signal-cyan"}`}><span className={`size-1.5 rounded-full ${phase === "error" ? "bg-signal-red" : dataReady ? "bg-signal-green" : "bg-signal-cyan"}`} />{phase === "error" ? "Failed" : dataReady ? "Complete" : phase === "idle" ? "Idle" : "Running"}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span><b className="text-foreground">{dataReady ? matches.length : 0}</b> matches</span>
                      <span><b className="text-signal-green">{dataReady ? matches.length : 0}</b> generated</span>
                      <span>· {sort.field} {sort.dir}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">Showing {filtered.length} of {dataReady ? matches.length : 0}</span>
                </div>
                <div className="mt-3 flex items-center gap-2 lg:hidden">
                  <label className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <span className="sr-only">Search matches</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-panel pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring" placeholder="Search team, venue, ID…" />
                  </label>
                  <Button variant="consoleOutline" size="sm" className="relative min-h-11 shrink-0 px-3" aria-label={`Filters and sorting${activeFilterCount ? `, ${activeFilterCount} active` : ""}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>
                    <SlidersHorizontal className="size-4" />
                    {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-signal-gold text-xs font-bold text-background">{activeFilterCount}</span>}
                  </Button>
                </div>
                <div className="mt-3 hidden items-center gap-2 lg:flex lg:flex-wrap" aria-label="Match filters">
                  <FilterSelect label="Gender" value={gender} options={["All", "Men", "Women"]} onChange={setGender} />
                  <FilterSelect label="Stage" value={stage} options={["All stages", "Group A", "Group B", "Group C", "Quarterfinal", "Semifinal", "Final"]} onChange={setStage} />
                  <FilterSelect label="Team" value={team} options={teams} onChange={setTeam} />
                  <label className="relative ml-auto hidden min-w-56 flex-1 lg:block lg:max-w-72">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <span className="sr-only">Search matches</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-10 w-full rounded-md border border-border bg-panel pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring" placeholder="Search team, venue, ID…" />
                  </label>
                </div>
                {filtersOpen && (
                  <div className="lg:hidden">
                    <button aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="fixed inset-0 z-40 cursor-pointer bg-background/70 backdrop-blur-sm" />
                    <div role="dialog" aria-modal="true" aria-label="Filters and sorting" className="animate-rise fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-border bg-panel-raised p-4 shadow-2xl">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-display text-sm font-bold uppercase">Filters &amp; sorting</h3>
                        <Button variant="ghost" size="sm" className="min-h-11 px-3 text-xs" onClick={() => setFiltersOpen(false)}><X />Close</Button>
                      </div>
                      <div className="mt-3 grid gap-2 [&_label]:min-h-12 [&_label]:w-full [&_select]:ml-auto [&_select]:text-sm">
                        <FilterSelect label="Gender" value={gender} options={["All", "Men", "Women"]} onChange={setGender} />
                        <FilterSelect label="Stage" value={stage} options={["All stages", "Group A", "Group B", "Group C", "Quarterfinal", "Semifinal", "Final"]} onChange={setStage} />
                        <FilterSelect label="Team" value={team} options={teams} onChange={setTeam} />
                        <div className="flex min-h-12 items-center gap-2 rounded-md border border-border bg-panel px-3">
                          <label className="relative flex flex-1 cursor-pointer items-center gap-2">
                            <span className="text-xs text-muted-foreground">Sort by</span>
                            <select className="cursor-pointer appearance-none bg-transparent pr-5 text-sm font-medium text-foreground outline-none" value={sort.field} onChange={(event) => setSort({ field: event.target.value as SortField, dir: sort.dir })}>
                              {(["kickoff", "match", "score", "stage", "gender"] as const).map((field) => <option key={field} className="bg-popover capitalize" value={field}>{sortFieldLabels[field]}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-0 size-3.5 text-muted-foreground" />
                          </label>
                          <button type="button" onClick={() => setSort({ field: sort.field, dir: sort.dir === "asc" ? "desc" : "asc" })} className="flex min-h-8 cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium uppercase text-foreground hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {sort.dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}{sort.dir}
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Button variant="consoleOutline" size="sm" className="min-h-11 flex-1 text-xs" onClick={() => { setGender("All"); setStage("All stages"); setTeam("All teams"); setSort({ field: "kickoff", dir: "asc" }); }}>Clear all</Button>
                        <Button size="sm" className="min-h-11 flex-1 text-xs" onClick={() => setFiltersOpen(false)}>Show {filtered.length} matches</Button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
              <div className="hidden grid-match-row gap-3 border-b border-border px-4 py-2.5 lg:grid">
                <SortHeader field="kickoff" sort={sort} onSort={setSort} />
                <SortHeader field="match" sort={sort} onSort={setSort} />
                <SortHeader field="score" sort={sort} onSort={setSort} />
                <SortHeader field="stage" sort={sort} onSort={setSort} />
                <SortHeader field="gender" sort={sort} onSort={setSort} />
              </div>
              <div className="flex-1 overflow-auto"><div className="divide-y divide-border">
                {phase === "loading" || phase === "filtering" || phase === "generating" ? (
                  <div className="grid min-h-64 place-items-center text-center text-sm text-muted-foreground">
                    <div>
                      <LoaderCircle className="mx-auto mb-2 size-6 animate-spin text-signal-cyan" />
                      Fetching and parsing schedule…<br />
                      <span className="text-xs">{phase === "loading" ? "Retrieving events" : phase === "filtering" ? "Isolating football matches" : "Generating endpoints"}</span>
                    </div>
                  </div>
                ) : phase === "error" ? (
                  <div className="grid min-h-64 place-items-center px-6 text-center text-sm text-signal-red">
                    <div>
                      <AlertTriangle className="mx-auto mb-2 size-6" />
                      Schedule source unavailable<br />
                      <span className="text-xs text-muted-foreground">The official schedule returned HTTP 503.</span>
                      <Button variant="consoleOutline" size="sm" className="mt-3 text-xs" onClick={() => { setFailNext(false); run(); }}><RefreshCw />Retry run</Button>
                    </div>
                  </div>
                ) : phase === "idle" ? (
                  <div className="grid min-h-64 place-items-center px-6 text-center text-sm text-muted-foreground">
                    <div>
                      <Play className="mx-auto mb-2 size-6" />
                      No run yet<br />
                      <span className="text-xs">Press Load &amp; generate to build the reference endpoints.</span>
                    </div>
                  </div>
                ) : filtered.length ? filtered.map((match) => (
                  <button key={match.id} aria-label={`${match.home} versus ${match.away}, ${match.date} at ${match.time}, ${match.gender}`} onClick={() => { setSelectedId(match.id); setCompared(false); setSheetOpen(true); }} className={`grid min-h-16 w-full cursor-pointer grid-cols-1 content-start items-start gap-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[1fr_auto] md:items-center md:gap-3 lg:grid-match-row lg:items-center ${selected?.id === match.id ? "md:bg-signal-gold/10 md:shadow-[inset_2px_0_0_var(--signal-gold)]" : "hover:bg-panel-raised"}`}>
                    <span className="flex items-center gap-1.5 text-base font-medium leading-tight md:hidden">
                      <Flag team={match.home} /><span className="truncate">{match.home}</span> <span className="text-muted-foreground">vs</span> <Flag team={match.away} /><span className="truncate">{match.away}</span>
                    </span>
                    <span className="flex items-center justify-between gap-3 text-xs text-muted-foreground md:hidden">
                      <span className="min-w-0 truncate">{match.date} · {match.time} UTC · {match.id} · {match.gender}</span>
                      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-foreground">{match.score}<span className="text-xs text-muted-foreground">{match.statusCode}</span><ChevronRight className="size-4 text-muted-foreground" /></span>
                    </span>
                    <span className="flex items-center gap-3 text-xs md:hidden">
                      <span className="min-w-0 truncate text-muted-foreground"><span className="text-foreground">Stage</span> · <span className={match.stage === "Final" ? "text-signal-gold" : "text-signal-cyan"}>{match.stage}</span></span>
                      <span className="flex shrink-0 items-center gap-1 text-signal-green"><span className="text-foreground">Output</span> · <span className="size-2 rounded-full bg-signal-green" />Generated</span>
                    </span>

                    <span className="hidden text-sm lg:block"><strong className="block font-medium">{match.date}</strong><span className="text-xs text-muted-foreground">{match.time} UTC</span></span>
                    <span className="hidden min-w-0 text-sm font-medium leading-tight md:block">
                      <span className="flex min-w-0 items-center gap-1.5 truncate max-lg:text-base"><Flag team={match.home} /><span className="truncate">{match.home}</span> <span className="text-muted-foreground">vs</span> <Flag team={match.away} /><span className="truncate">{match.away}</span></span>
                      <span className="mt-1 block truncate text-xs font-normal text-muted-foreground lg:hidden">{match.date} · {match.time} UTC · {match.id} · {match.gender}</span>
                      <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal lg:hidden">
                        <span className="min-w-0 truncate text-muted-foreground"><span className="text-foreground">Stage</span> · <span className={match.stage === "Final" ? "text-signal-gold" : "text-signal-cyan"}>{match.stage}</span></span>
                        <span className="flex shrink-0 items-center gap-1 text-signal-green"><span className="text-foreground">Output</span> · <span className="size-2 rounded-full bg-signal-green" />Generated</span>
                      </span>
                      <span className="mt-1 hidden truncate text-xs font-normal text-muted-foreground lg:block">{match.id} · {match.gender} · {match.venue}, {match.city}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-2 text-sm md:flex">{match.score}<span className="text-xs text-muted-foreground">{match.statusCode}</span></span>
                    <span className={`hidden text-xs lg:block ${match.stage === "Final" ? "text-signal-gold" : "text-signal-cyan"}`}>{match.stage}</span>
                    <span className="hidden items-center gap-1.5 text-xs lg:flex text-signal-green"><span className="size-2 rounded-full bg-signal-green" />Generated</span>
                  </button>

                )) : <div className="grid min-h-64 place-items-center px-6 text-center text-sm text-muted-foreground"><div><Search className="mx-auto mb-2 size-6" />No football matches found<br /><span className="text-xs">Adjust filters or clear the search.</span><Button variant="consoleOutline" size="sm" className="mt-3 text-xs" onClick={() => { setGender("All"); setStage("All stages"); setTeam("All teams"); setQuery(""); }}>Clear filters</Button></div></div>}
              </div></div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 md:hidden">
                <p className="min-w-0 truncate text-xs text-muted-foreground">{filtered.length} of {dataReady ? matches.length : 0} records · {sort.field} {sort.dir}</p>
                <div className="relative shrink-0">
                  <Button variant="console" size="sm" className="min-h-11 text-xs" onClick={() => setExportOpen(!exportOpen)} aria-expanded={exportOpen} disabled={!dataReady}><Download />Export JSON<ChevronDown /></Button>
                  {exportOpen && <div className="absolute bottom-full right-0 z-30 mb-2 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                    {([["all", `All ${matches.length} matches`], ["filtered", `Filtered (${filtered.length})`], ["one", "Selected match only"]] as const).map(([scope, label]) => <button key={scope} onClick={() => exportJson(scope)} className="block w-full cursor-pointer px-3 py-3 text-left text-sm hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{label}</button>)}
                  </div>}
                </div>
              </div>
            </section>


            <div
              role="separator"
              aria-label="Resize panels"
              aria-orientation="vertical"
              aria-valuemin={28}
              aria-valuemax={72}
              aria-valuenow={Math.round(leftWidth)}
              onMouseDown={startResize}
              className="group relative z-10 hidden cursor-col-resize items-center justify-center bg-background transition-colors hover:bg-border md:flex"
              style={{ width: 8, minWidth: 8, flex: "0 0 auto" }}
            >
              <div className="h-10 w-1 rounded-full bg-border group-hover:bg-muted-foreground transition-colors" />
            </div>

            {sheetOpen && <button aria-label="Close match details" onClick={() => setSheetOpen(false)} className="fixed inset-0 z-40 cursor-pointer bg-background/70 backdrop-blur-sm md:hidden" />}

            <section
              aria-label="Match inspector"
              className={`animate-rise flex flex-1 flex-col overflow-hidden border border-border bg-panel-raised [animation-delay:170ms] md:static md:inset-auto md:z-auto md:flex md:rounded-r-md ${sheetOpen ? "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-16 max-md:z-50 max-md:rounded-t-2xl max-md:shadow-2xl" : "max-md:hidden"}`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0 md:hidden">
                  <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">{selected ? <><Flag team={selected.home} /><span className="truncate">{selected.home}</span><span className="text-muted-foreground">vs</span><Flag team={selected.away} /><span className="truncate">{selected.away}</span></> : "No match selected"}</p>
                  <p className="truncate text-xs text-muted-foreground">{selected ? `${selected.id} · ${selected.date} · ${selected.time} UTC` : "—"}</p>
                </div>
                <div className="hidden min-w-0 gap-1 md:flex" role="tablist" aria-label="Match inspector">
                  {([['endpoint', 'Endpoint'], ['data', 'Source data'], ['compare', 'Compare']] as const).map(([value, label]) => <Button key={value} variant={inspector === value ? "console" : "ghost"} size="sm" role="tab" aria-selected={inspector === value} onClick={() => setInspector(value)} className="min-h-10 px-3 text-xs">{value === "compare" && <GitCompareArrows />}{label}</Button>)}
                </div>
                <span className="hidden truncate text-xs text-muted-foreground xl:inline">{selected?.id ?? "—"}</span>
                <Button variant="ghost" size="sm" className="min-h-11 shrink-0 px-3 text-xs md:hidden" onClick={() => setSheetOpen(false)}><X />Close</Button>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden" role="tablist" aria-label="Match inspector sections">
                {([['endpoint', 'Endpoint'], ['data', 'Source data'], ['compare', 'Compare']] as const).map(([value, label]) => <Button key={value} variant={inspector === value ? "console" : "ghost"} size="sm" role="tab" aria-selected={inspector === value} onClick={() => setInspector(value)} className="min-h-11 shrink-0 px-3 text-xs">{value === "compare" && <GitCompareArrows />}{label}</Button>)}
              </div>


              <div className="flex-1 overflow-auto">
                {!selected ? <div className="flex-1 grid place-items-center px-6 text-center text-sm text-muted-foreground">Select a match to inspect its generated endpoint.</div> : (
                <>
                  {inspector === "endpoint" && <div role="tabpanel" className="flex flex-col">
                    <div className="px-4 pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="rounded bg-signal-red/15 px-2 py-0.5 text-xs font-semibold text-signal-red">GET</span>
                          <span className="text-xs text-muted-foreground">Expected API request</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs text-signal-green"><Check className="size-3.5" />Reference endpoint ready</span>
                      </div>
                      <div className="rounded-md border border-border bg-background px-3 py-3 text-xs leading-relaxed break-all">
                        <span className="text-signal-green">GET </span>{endpoint}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="console" size="sm" className="min-h-10 flex-1 text-xs" onClick={() => copy(`${baseUrl}${endpoint}`, "Endpoint copied to clipboard")}><Clipboard />Copy endpoint</Button>
                        <Button variant="consoleOutline" size="sm" className="min-h-10 text-xs" onClick={() => copy(`curl -s '${baseUrl}${endpoint}' -H 'Accept: application/json'`, "cURL command copied")}><Copy />cURL</Button>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-border px-4 py-3">
                      <p className="mb-3 text-xs uppercase tracking-16 text-muted-foreground">Fields used to generate endpoint</p>
                      <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-xs">
                        <dt className="text-muted-foreground">sport</dt><dd>football</dd>
                        <dt className="text-muted-foreground">competition</dt><dd>paris-2024</dd>
                        <dt className="text-muted-foreground">match_id</dt><dd>{selected.id}</dd>
                        <dt className="text-muted-foreground">kickoff_utc</dt><dd>{selected.iso}</dd>
                        <dt className="text-muted-foreground">participants</dt><dd className="flex flex-wrap items-center gap-x-1.5 gap-y-1"><span className="inline-flex items-center gap-1.5"><Flag team={selected.home} />{selected.home}</span><span className="text-muted-foreground">·</span><span className="inline-flex items-center gap-1.5"><Flag team={selected.away} />{selected.away}</span></dd>
                        <dt className="text-muted-foreground">venue</dt><dd>{selected.venue}, {selected.city}</dd>
                        <dt className="text-muted-foreground">round</dt><dd>{selected.round}</dd>
                        <dt className="text-muted-foreground">status</dt><dd>{selected.statusCode}</dd>
                      </dl>
                    </div>
                  </div>}

                  {inspector === "data" && <div role="tabpanel" className="flex h-full flex-col">
                    <div className="mb-3 flex items-center justify-between px-4 pt-4">
                      <p className="text-xs uppercase tracking-16 text-muted-foreground">Parsed schedule record</p>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copy(JSON.stringify(recordFor(selected), null, 2), "Record JSON copied")}><Copy />Copy JSON</Button>
                    </div>
                    <pre className="mx-4 flex-1 overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-6 text-muted-foreground"><code>{JSON.stringify(recordFor(selected), null, 2)}</code></pre>
                  </div>}

                  {inspector === "compare" && <div role="tabpanel" className="flex flex-col p-4">
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="flex items-start gap-3">
                        <GitCompareArrows className="mt-0.5 size-5 text-signal-gold" />
                        <div>
                          <h3 className="font-display text-sm font-bold uppercase">Automated JSON comparison</h3>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Compare the generated reference with the response from the tested FootyScores API.</p>
                        </div>
                      </div>
                      <label className="mt-4 block text-xs uppercase tracking-14 text-muted-foreground">
                        Test API base URL
                        <input className="mt-2 min-h-10 w-full rounded-md border border-border bg-panel px-3 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
                      </label>
                      <Button variant="consoleOutline" className="mt-3 min-h-10 w-full text-xs" onClick={runCompare} disabled={comparing}>{comparing ? <LoaderCircle className="animate-spin" /> : <GitCompareArrows />}{comparing ? "Comparing…" : "Run comparison"}</Button>
                    </div>
                    {compared ? <div className="mt-3 overflow-hidden rounded-md border border-border">
                      <div className="grid grid-compare-row gap-2 border-b border-border bg-panel px-3 py-2.5 text-xs uppercase tracking-widest text-muted-foreground"><span>Field</span><span>Expected</span><span>Actual</span></div>
                      {compareRows(selected).map((row) => <div key={row.field} className={`grid grid-compare-row gap-2 border-b border-border px-3 py-2.5 text-xs last:border-0 ${row.state === "pass" ? "" : "bg-signal-red/5"}`}><span className="text-muted-foreground">{row.field}</span><span className="break-all">{row.expected}</span><span className={`break-all ${row.state === "pass" ? "text-signal-green" : "text-signal-red"}`}>{row.actual}</span></div>)}
                      <p className="bg-panel px-3 py-2.5 text-xs text-muted-foreground">{compareRows(selected).filter((row) => row.state === "pass").length} passed · 0 changed · 0 missing</p>
                    </div> : <div className="mt-3 flex items-start gap-2 rounded-md border border-signal-gold/30 bg-signal-gold/5 p-3 text-xs text-muted-foreground"><AlertTriangle className="size-5 shrink-0 text-signal-gold" /><span>{comparing ? "Comparison in progress…" : "Comparison has not run for this match yet."}</span></div>}
                  </div>}
                </>
              )}
              </div>

              <div className="mt-auto hidden flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 md:flex">
                <div>
                  <p className="text-xs uppercase tracking-14 text-muted-foreground">Export run</p>
                  <p className="mt-0.5 text-xs">{filtered.length} of {dataReady ? matches.length : 0} records · JSON · {sort.field} {sort.dir}</p>
                </div>
                <div className="relative">
                  <Button variant="console" size="sm" className="min-h-10 text-xs" onClick={() => setExportOpen(!exportOpen)} aria-expanded={exportOpen} disabled={!dataReady}><Download />Export JSON<ChevronDown /></Button>
                  {exportOpen && <div className="absolute bottom-full right-0 z-10 mb-2 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                    {([["all", `All ${matches.length} matches`], ["filtered", `Filtered (${filtered.length})`], ["one", "Selected match only"]] as const).map(([scope, label]) => <button key={scope} onClick={() => exportJson(scope)} className="block w-full px-3 py-3 text-left text-xs hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{label}</button>)}
                  </div>}
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="mt-4 hidden flex-wrap lg:flex items-center justify-between gap-2 border-t border-border pt-4 text-xs uppercase tracking-widest text-muted-foreground">
          <span>Reference schema · example.json</span>
          <span>Deterministic order · {sort.field} {sort.dir}</span>
          <span>Interactive prototype · mock data</span>
        </footer>
      </div>

      <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
        {toast && <div className="flex items-center gap-2 rounded-md border border-signal-green/40 bg-panel px-3 py-2 text-xs text-signal-green shadow-lg"><Check className="size-3.5" />{toast}</div>}
      </div>
    </main>
  );
}
