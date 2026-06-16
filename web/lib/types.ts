export type ReviewPublic = {
  id: string;
  target_type: string;
  city: string;
  district: string | null;
  property_type: string | null;
  public_title: string | null;
  public_text: string | null;
  rating: number | null;
  created_at: string;
  published_at: string | null;
};

export type ReplyPublic = {
  id: string;
  review_id: string;
  text: string;
  created_at: string;
  published_at: string | null;
};

export type ReviewFilters = {
  city?: string;
  target_type?: string;
  rating?: string;
};
