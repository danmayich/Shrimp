import { api } from './apiClient';

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  itemType: 'shrimp' | 'equipment' | 'food' | 'plant' | 'decor';
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  notes: string;
  listedAt: string;
  /** For shrimp listings: variant info */
  shrimpVariantId?: string;
  shrimpStage?: string;
  shrimpSex?: string;
  shrimpAgeGameDays?: number;
}

export interface CreateListingRequest {
  itemType: MarketListing['itemType'];
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  notes: string;
  shrimpVariantId?: string;
  shrimpId?: string;
}

export const marketplaceApi = {
  getListings: (filters?: { itemType?: string; variantId?: string; maxPrice?: number }) =>
    api.get<MarketListing[]>('/marketplace', { params: filters }),
  createListing: (data: CreateListingRequest) =>
    api.post<MarketListing>('/marketplace/list', data),
  buyListing: (listingId: string) =>
    api.post<{ newBalance: number }>(`/marketplace/buy/${listingId}`),
  cancelListing: (listingId: string) =>
    api.delete(`/marketplace/${listingId}`),
};
