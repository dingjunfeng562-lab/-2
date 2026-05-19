import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import { SubmitCompetitionRegistrationDto } from './dto/competition-registration.dto';

@Controller('competitions')
export class CompetitionsController {
  constructor(private competitionsService: CompetitionsService) {}

  @Get()
  listCompetitions() {
    return this.competitionsService.listPublicCompetitions();
  }

  @Get(':id')
  getCompetition(@Param('id') id: string) {
    return this.competitionsService.getPublicCompetition(id);
  }

  @Post(':id/register')
  submitRegistration(
    @Param('id') id: string,
    @Body() dto: SubmitCompetitionRegistrationDto,
  ) {
    return this.competitionsService.submitRegistration(id, dto);
  }

  @Get(':id/players')
  listPlayers(@Param('id') id: string) {
    return this.competitionsService.listPublicPlayers(id);
  }
}
