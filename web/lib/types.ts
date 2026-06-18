export type ReviewPublic = {
  id: string;
  target_type: string;
  city: string;
  district: string | null;
  street_or_complex: string | null;
  building_number: string | null;
  apartment_number: string | null;
  address_public: string | null;
  address_search_key?: string | null;
  property_type: string | null;
  author_display_name: string | null;
  public_title: string | null;
  public_text: string | null;
  rating: number | null;
  created_at: string;
  published_at: string | null;
  organization_name?: string | null;
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
  address?: string;
  target_type?: string;
  rating?: string;
};
