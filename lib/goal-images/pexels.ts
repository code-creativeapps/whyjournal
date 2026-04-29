export type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  src: {
    small: string;
    medium: string;
    large: string;
    large2x: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  photographer: string;
  photographer_url: string;
  alt?: string;
};

type PexelsResponse = { photos: PexelsPhoto[]; total_results?: number; next_page?: string };

const ENDPOINT = 'https://api.pexels.com/v1/search';

export async function searchPexels(
  query: string,
  page = 1,
  perPage = 24
): Promise<PexelsPhoto[]> {
  const apiKey = process.env.EXPO_PUBLIC_PEXELS_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_PEXELS_API_KEY is not set');
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `${ENDPOINT}?query=${encodeURIComponent(trimmed)}&per_page=${perPage}&page=${page}`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) {
    throw new Error(`Pexels search failed: ${res.status}`);
  }
  const json = (await res.json()) as PexelsResponse;
  return json.photos ?? [];
}

export function pexelsAttribution(photo: PexelsPhoto): string {
  return `Photo by ${photo.photographer} / Pexels`;
}
