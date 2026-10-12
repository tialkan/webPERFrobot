export type Finding = { kod: string; baslik: string; seviye: string; kanit: { url: string; bulunan: string }; cozum: string };
export type Row = { etiket: string; deger: string; url?: string };
export type Report = { arac: string; surum: string; olusturuldu: string; hedef: { girilen: string }; ozet: { sureMs: number; incelenenSayfa: number; bulgu: number; bolum: number }; bulgular: Finding[]; bolumler: { baslik: string; satirlar: Row[] }[]; sinirlar: string[] };
export function auditSite(input: string, options?: Record<string, unknown>): Promise<Report>;
