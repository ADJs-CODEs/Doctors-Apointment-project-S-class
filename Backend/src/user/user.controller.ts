import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserAuthGuard, UserId } from '../common/auth';
import { ImageUpload } from '../common/upload';
import { UserService } from './user.service';

@Controller('api/user')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.users.register(body);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: any) {
    return this.users.login(body);
  }

  @Post('google-auth')
  @HttpCode(200)
  googleAuth(@Body('access_token') accessToken?: string) {
    return this.users.googleAuth(accessToken);
  }

  @Get('get-profile')
  @UseGuards(UserAuthGuard)
  getProfile(@UserId() userId: string) {
    return this.users.getProfile(userId);
  }

  @Post('update-profile')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  @UseInterceptors(ImageUpload())
  updateProfile(
    @UserId() userId: string,
    @Body() body: any,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.users.updateProfile(userId, body, image?.path);
  }

  @Post('book-appointment')
  @UseGuards(UserAuthGuard)
  bookAppointment(@UserId() userId: string, @Body() body: any) {
    return this.users.bookAppointment(userId, body);
  }

  @Get('appointments')
  @UseGuards(UserAuthGuard)
  listAppointments(@UserId() userId: string) {
    return this.users.listAppointments(userId);
  }

  @Post('cancel-appointment')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  cancelAppointment(@UserId() userId: string, @Body('appointmentId') appointmentId?: string) {
    return this.users.cancelAppointment(userId, appointmentId);
  }

  @Post('payment-stripe')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  paymentStripe(@UserId() userId: string, @Body('appointmentId') appointmentId?: string) {
    return this.users.startStripePayment(userId, appointmentId);
  }

  @Post('verify-stripe')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  verifyStripe(@UserId() userId: string, @Body() body: any) {
    return this.users.verifyStripePayment(userId, body);
  }

  @Post('update-dose')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  updateDose(@UserId() userId: string, @Body() body: any) {
    return this.users.logDose(userId, body);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  changePassword(@UserId() userId: string, @Body() body: any) {
    return this.users.changePassword(userId, body);
  }

  @Post('delete-account')
  @HttpCode(200)
  @UseGuards(UserAuthGuard)
  deleteAccount(@UserId() userId: string) {
    return this.users.deleteAccount(userId);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body('email') email?: string) {
    return this.users.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() body: any) {
    return this.users.resetPassword(body);
  }
}
