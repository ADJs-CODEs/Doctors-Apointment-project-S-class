import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminAuthGuard, UserAuthGuard, UserId } from '../common/auth';
import { PharmacyAuthGuard, PharmacyRoles, Staff, type StaffContext } from './pharmacy.auth';
import { PharmacyService } from './pharmacy.service';
import { PharmacyEarningsService } from './earnings.service';
import { OrderService } from './order.service';
import { ProductImageUpload, ProductService } from './product.service';
import { ShopService } from './shop.service';

/** The pharmacy portal (pharmacy personnel, in the admin/doctor panel). */
@Controller('api/pharmacy')
export class PharmacyController {
  constructor(
    private readonly pharmacy: PharmacyService,
    private readonly products: ProductService,
    private readonly orders: OrderService,
    private readonly earnings: PharmacyEarningsService,
  ) {}

  @Post('apply')
  @HttpCode(200)
  apply(@Body() body: any) {
    return this.pharmacy.apply(body);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: any) {
    return this.pharmacy.login(body);
  }

  @Get('me')
  @UseGuards(PharmacyAuthGuard)
  me(@Staff() ctx: StaffContext) {
    return this.pharmacy.me(ctx);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(PharmacyAuthGuard)
  changePassword(@Staff() ctx: StaffContext, @Body() body: any) {
    return this.pharmacy.changePassword(ctx, body);
  }

  @Put('settings')
  @UseGuards(PharmacyAuthGuard)
  @PharmacyRoles('owner')
  updateSettings(@Staff() ctx: StaffContext, @Body() body: any) {
    return this.pharmacy.updateSettings(ctx, body);
  }

  @Get('staff')
  @UseGuards(PharmacyAuthGuard)
  @PharmacyRoles('owner')
  listStaff(@Staff() ctx: StaffContext) {
    return this.pharmacy.listStaff(ctx);
  }

  @Post('staff')
  @HttpCode(200)
  @UseGuards(PharmacyAuthGuard)
  @PharmacyRoles('owner')
  addStaff(@Staff() ctx: StaffContext, @Body() body: any) {
    return this.pharmacy.addStaff(ctx, body);
  }

  @Patch('staff/:id')
  @UseGuards(PharmacyAuthGuard)
  @PharmacyRoles('owner')
  updateStaff(@Staff() ctx: StaffContext, @Param('id') id: string, @Body() body: any) {
    return this.pharmacy.updateStaff(ctx, id, body);
  }

  // --- products (any staff role) ---

  @Get('products')
  @UseGuards(PharmacyAuthGuard)
  listProducts(@Staff() ctx: StaffContext) {
    return this.products.list(ctx);
  }

  @Post('products')
  @HttpCode(200)
  @UseGuards(PharmacyAuthGuard)
  @UseInterceptors(ProductImageUpload())
  createProduct(@Staff() ctx: StaffContext, @Body() body: any, @UploadedFile() image?: Express.Multer.File) {
    return this.products.create(ctx, body, image?.path);
  }

  @Patch('products/:id')
  @UseGuards(PharmacyAuthGuard)
  @UseInterceptors(ProductImageUpload())
  updateProduct(@Staff() ctx: StaffContext, @Param('id') id: string, @Body() body: any, @UploadedFile() image?: Express.Multer.File) {
    return this.products.update(ctx, id, body, image?.path);
  }

  @Post('products/:id/stock')
  @HttpCode(200)
  @UseGuards(PharmacyAuthGuard)
  setStock(@Staff() ctx: StaffContext, @Param('id') id: string, @Body() body: any) {
    return this.products.setStock(ctx, id, body);
  }

  // --- orders (any staff role; prescription orders need a pharmacist, checked in the service) ---

  /** view = new | active | done */
  @Get('orders')
  @UseGuards(PharmacyAuthGuard)
  listOrders(@Staff() ctx: StaffContext, @Query('view') view?: string) {
    return this.orders.pharmacyOrders(ctx, view);
  }

  @Post('orders/:id/accept')
  @HttpCode(200)
  @UseGuards(PharmacyAuthGuard)
  acceptOrder(@Staff() ctx: StaffContext, @Param('id') id: string) {
    return this.orders.accept(ctx, id);
  }

  @Post('orders/:id/reject')
  @HttpCode(200)
  @UseGuards(PharmacyAuthGuard)
  rejectOrder(@Staff() ctx: StaffContext, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.orders.reject(ctx, id, reason);
  }

  /** { status: 'packing' | 'out_for_delivery' | 'delivered' } */
  @Post('orders/:id/status')
  @HttpCode(200)
  @UseGuards(PharmacyAuthGuard)
  advanceOrder(@Staff() ctx: StaffContext, @Param('id') id: string, @Body('status') status?: string) {
    return this.orders.advance(ctx, id, status);
  }

  // --- earnings and withdrawals (owner) ---

  @Get('earnings')
  @UseGuards(PharmacyAuthGuard)
  @PharmacyRoles('owner')
  earningsOverview(@Staff() ctx: StaffContext) {
    return this.earnings.overview(ctx);
  }

  @Get('banks')
  @UseGuards(PharmacyAuthGuard)
  @PharmacyRoles('owner')
  banks() {
    return this.earnings.bankOptions();
  }

  /** { bankCode, accountNumber } with Paystack, or { bankName, accountName, accountNumber } */
  @Put('payout-bank')
  @UseGuards(PharmacyAuthGuard)
  @PharmacyRoles('owner')
  saveBank(@Staff() ctx: StaffContext, @Body() body: any) {
    return this.earnings.saveBank(ctx, body);
  }

  @Post('payouts')
  @HttpCode(200)
  @UseGuards(PharmacyAuthGuard)
  @PharmacyRoles('owner')
  requestPayout(@Staff() ctx: StaffContext, @Body() body: any) {
    return this.earnings.requestPayout(ctx, body ?? {});
  }

  @Post('staff/:id/reset-password')
  @HttpCode(200)
  @UseGuards(PharmacyAuthGuard)
  @PharmacyRoles('owner')
  resetStaffPassword(@Staff() ctx: StaffContext, @Param('id') id: string) {
    return this.pharmacy.resetStaffPassword(ctx, id);
  }
}

/** The admin's view: approve, reject, suspend, and create the clinic's own pharmacy. */
@Controller('api/admin/pharmacies')
@UseGuards(AdminAuthGuard)
export class AdminPharmaciesController {
  constructor(private readonly pharmacy: PharmacyService) {}


  @Get()
  list(@Query('status') status?: string) {
    return this.pharmacy.adminList(status);
  }

  @Post()
  @HttpCode(200)
  createClinicPharmacy(@Body() body: any) {
    return this.pharmacy.createClinicPharmacy(body);
  }

  @Post(':id/status')
  @HttpCode(200)
  setStatus(@Param('id') id: string, @Body() body: any) {
    return this.pharmacy.setStatus(id, body);
  }
}

/** The patient's medicine shop: what pharmacies near them sell. */
@Controller('api/shop')
@UseGuards(UserAuthGuard)
export class ShopController {
  constructor(
    private readonly shop: ShopService,
    private readonly orders: OrderService,
  ) {}

  /** { origin?: { lat, lng }, q?, category?, pharmacyId? } (no origin: their home address) */
  @Post('browse')
  @HttpCode(200)
  browse(@UserId() userId: string, @Body() body: any) {
    return this.shop.browse(userId, body ?? {});
  }

  @Get('prescriptions')
  prescriptions(@UserId() userId: string) {
    return this.orders.prescriptions(userId);
  }

  /** { pharmacyId, items: [{ productId, quantity, prescriptionAppointmentId? }], delivery: { address, phone, note? }, origin?, payWith: 'wallet' | 'card' } */
  @Post('orders')
  @HttpCode(200)
  placeOrder(@UserId() userId: string, @Body() body: any) {
    return this.orders.create(userId, body ?? {});
  }

  @Get('orders')
  myOrders(@UserId() userId: string) {
    return this.orders.myOrders(userId);
  }

  @Get('orders/:id')
  myOrder(@UserId() userId: string, @Param('id') id: string) {
    return this.orders.myOrder(userId, id);
  }

  @Post('orders/:id/pay')
  @HttpCode(200)
  payAgain(@UserId() userId: string, @Param('id') id: string) {
    return this.orders.payAgain(userId, id);
  }

  @Post('orders/:id/verify')
  @HttpCode(200)
  verify(@UserId() userId: string, @Param('id') id: string, @Body('session_id') sessionId?: string) {
    return this.orders.verify(userId, id, sessionId);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  cancel(@UserId() userId: string, @Param('id') id: string) {
    return this.orders.cancel(userId, id);
  }
}

/** The admin's side of the shop money: pharmacy withdrawals and every order. */
@Controller('api/admin')
@UseGuards(AdminAuthGuard)
export class AdminShopController {
  constructor(
    private readonly earnings: PharmacyEarningsService,
    private readonly orders: OrderService,
  ) {}

  @Get('pharmacy-payouts')
  payouts(@Query('status') status?: string) {
    return this.earnings.adminList(status);
  }

  @Post('pharmacy-payouts/:id/send')
  @HttpCode(200)
  send(@Param('id') id: string, @Body() body: any) {
    return this.earnings.send(id, body ?? {});
  }

  @Post('pharmacy-payouts/:id/paid')
  @HttpCode(200)
  markPaid(@Param('id') id: string, @Body() body: any) {
    return this.earnings.markPaid(id, body ?? {});
  }

  @Post('pharmacy-payouts/:id/reject')
  @HttpCode(200)
  reject(@Param('id') id: string, @Body() body: any) {
    return this.earnings.reject(id, body ?? {});
  }

  @Post('pharmacy-payouts/:id/refresh')
  @HttpCode(200)
  refresh(@Param('id') id: string) {
    return this.earnings.refresh(id);
  }

  /** view = open | delivered | closed | attention (refunds that failed) | all */
  @Get('shop-orders')
  shopOrders(@Query('view') view?: string) {
    return this.orders.adminList(view);
  }
}
