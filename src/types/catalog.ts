export type Note = {
  slug: string;
  name: string;
  image: string;
  imageAlt: string;
  content: string;
};

export type PerfumeSize = {
  label: string;
  ml: number;
  price: number;
};

export type Perfume = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  gender: string;
  image: string;
  imageAlt: string;
  stockStatus: string;
  inStock: boolean;
  externalLink: string;
  sizes: PerfumeSize[];
  noteSlugs: {
    top: string[];
    heart: string[];
    base: string[];
  };
};

export type PerfumeWithNotes = Perfume & {
  notes: {
    top: Note[];
    heart: Note[];
    base: Note[];
  };
};