import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DrawsService } from './draws.service';
import {
  CreateRegistrationDto,
  GenerateDrawDto,
  UpdateRegistrationDto,
} from './dto/draw.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller()
export class DrawsController {
  constructor(private drawsService: DrawsService) {}

  @Get('events/:eventId/registrations')
  listRegistrations(@Param('eventId') eventId: string) {
    return this.drawsService.listRegistrations(eventId);
  }

  @Post('events/:eventId/registrations')
  createRegistration(
    @Param('eventId') eventId: string,
    @Body() dto: CreateRegistrationDto,
  ) {
    return this.drawsService.createRegistration(eventId, dto);
  }

  @Patch('registrations/:id')
  updateRegistration(@Param('id') id: string, @Body() dto: UpdateRegistrationDto) {
    return this.drawsService.updateRegistration(id, dto);
  }

  @Delete('registrations/:id')
  removeRegistration(@Param('id') id: string) {
    return this.drawsService.removeRegistration(id);
  }

  @Post('events/:eventId/draw')
  generateDraw(@Param('eventId') eventId: string, @Body() dto: GenerateDrawDto) {
    return this.drawsService.generateDraw(eventId, dto);
  }

  @Get('events/:eventId/bracket')
  getBracket(@Param('eventId') eventId: string) {
    return this.drawsService.getBracket(eventId);
  }
}
