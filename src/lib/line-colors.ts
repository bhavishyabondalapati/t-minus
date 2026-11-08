export const LINE_COLORS: Record<string, string> = {
  Red: "#DA291C", Mattapan: "#DA291C", Orange: "#ED8B00", Blue: "#003DA5",
  "Green-B": "#00843D", "Green-C": "#00843D", "Green-D": "#00843D", "Green-E": "#00843D",
};
export const lineColor = (id: string) => LINE_COLORS[id] ?? "#888888";
