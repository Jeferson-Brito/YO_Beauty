import { Router } from 'express';
import {
  addImage,
  createBanner,
  createCategory,
  createPage,
  createProduct,
  createSection,
  getProduct,
  getSettings,
  listBanners,
  listCategories,
  listChanges,
  listPages,
  listProducts,
  listSections,
  removeBanner,
  removeCategory,
  removeImage,
  removePage,
  removeSection,
  reorderImages,
  updateBanner,
  updateCategory,
  updateImage,
  updatePage,
  updateProduct,
  updateSection,
  updateSettings,
  uploadBannerImage,
  uploadCategoryImage,
  uploadLogo,
  uploadSectionImage,
} from '../controllers/admin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { uploadImage } from '../middlewares/upload';
import { exportDashboard, getDashboard } from '../controllers/dashboard.controller';
import { cancelAdminOrder, getAdminOrder, listAdminOrders } from '../controllers/order.controller';

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAdmin);

adminRoutes.get('/ping', (_req, res) => {
  res.json({ data: { ok: true } });
});

adminRoutes.get('/products', listProducts);
adminRoutes.post('/products', createProduct);
adminRoutes.get('/products/:id', getProduct);
adminRoutes.patch('/products/:id', updateProduct);
adminRoutes.get('/products/:id/changes', listChanges);
adminRoutes.post('/products/:id/images', uploadImage, addImage);
adminRoutes.patch('/products/:id/images/reorder', reorderImages);
adminRoutes.patch('/products/:id/images/:imageId', updateImage);
adminRoutes.delete('/products/:id/images/:imageId', removeImage);

adminRoutes.get('/categories', listCategories);
adminRoutes.post('/categories', createCategory);
adminRoutes.patch('/categories/:id', updateCategory);
adminRoutes.delete('/categories/:id', removeCategory);
adminRoutes.post('/categories/:id/image', uploadImage, uploadCategoryImage);

adminRoutes.get('/sections', listSections);
adminRoutes.post('/sections', createSection);
adminRoutes.patch('/sections/:id', updateSection);
adminRoutes.delete('/sections/:id', removeSection);
adminRoutes.post('/sections/:id/image', uploadImage, uploadSectionImage);

adminRoutes.get('/banners', listBanners);
adminRoutes.post('/banners', createBanner);
adminRoutes.patch('/banners/:id', updateBanner);
adminRoutes.delete('/banners/:id', removeBanner);
adminRoutes.post('/banners/:id/image', uploadImage, uploadBannerImage);

adminRoutes.get('/pages', listPages);
adminRoutes.post('/pages', createPage);
adminRoutes.patch('/pages/:id', updatePage);
adminRoutes.delete('/pages/:id', removePage);

adminRoutes.get('/dashboard.csv', exportDashboard);
adminRoutes.get('/dashboard', getDashboard);
adminRoutes.get('/orders', listAdminOrders);
adminRoutes.get('/orders/:id', getAdminOrder);
adminRoutes.post('/orders/:id/cancel', cancelAdminOrder);

adminRoutes.get('/settings', getSettings);
adminRoutes.patch('/settings', updateSettings);
adminRoutes.post('/settings/logo', uploadImage, uploadLogo);
