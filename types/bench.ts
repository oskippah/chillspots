export type Bench = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  hasTrash: boolean;
  hearts: number;
  photoBench: string | null;
  photoView: string | null;
  isPublic: boolean;
  uploaderUsername: string | null;
  benchType: string;
};
