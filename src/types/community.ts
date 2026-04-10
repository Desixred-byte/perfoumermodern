export type CommentRow = {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string | null;
  user_email?: string | null;
  perfume_slug: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type WishlistRow = {
  user_id: string;
  perfume_slug: string;
  created_at: string;
};
