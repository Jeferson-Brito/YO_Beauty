import { Router } from 'express';
import {
  getBanners,
  getCategories,
  getCategory,
  getFeaturedProducts,
  getHome,
  getHomeSections,
  getNewArrivals,
  getPage,
  getProduct,
  getProducts,
  getStore,
} from '../controllers/catalog.controller';
import { listReviews, removeReview, saveReview } from '../controllers/review.controller';
import { optionalAuth, requireAuth } from '../middlewares/auth';

export const catalogRoutes = Router();

catalogRoutes.get('/store', getStore);
catalogRoutes.get('/home', getHome);
catalogRoutes.get('/categories', getCategories);
catalogRoutes.get('/categories/:slug', getCategory);
catalogRoutes.get('/products/featured', getFeaturedProducts);
catalogRoutes.get('/products/new-arrivals', getNewArrivals);
catalogRoutes.get('/products', getProducts);
catalogRoutes.get('/products/:slug/reviews', optionalAuth, listReviews);
catalogRoutes.post('/products/:slug/reviews', requireAuth, saveReview);
catalogRoutes.delete('/products/:slug/reviews/:reviewId', requireAuth, removeReview);
catalogRoutes.get('/products/:slug', getProduct);
catalogRoutes.get('/banners', getBanners);
catalogRoutes.get('/home-sections', getHomeSections);
catalogRoutes.get('/pages/:slug', getPage);
