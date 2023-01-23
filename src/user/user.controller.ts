import { AuthService } from './auth.service';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Session,
  UseGuards,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { UserDto } from './dto/user.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';
import axios from 'axios';

@Controller('user')
@Serialize(UserDto)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post('/signup')
  async create(
    @Body() { email, password, recaptchaToken }: CreateUserDto,
    @Res() res: any,
    @Session() session: any,
  ) {
    async function validateRecaptchaToken(recaptchaToken: string) {
      const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
      const response = await axios.get(
        `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`,
        { method: 'POST' },
      );
      const data = await response.data;
      return data.success;
    }

    validateRecaptchaToken(recaptchaToken).then(async (recaptchaResult) => {
      if (recaptchaResult === true) {
        const user = await this.authService.signup(
          email,
          password,
          recaptchaToken,
        );
        res.send('Usuário criado com sucesso');
        session.userId = user.id;
        return user;
      } else {
        throw new NotFoundException('recaptcha invalid');
      }
    });
  }

  @Post('/signin')
  async login(@Body() { email, password }: any, @Session() session: any) {
    const user = await this.authService.signin(email, password);
    session.userId = user.id;
    return user;
  }

  @Get('/status')
  userStatus(@Session() session: any, @CurrentUser() user: User) {
    console.log(session);
    if (session.userId) {
      const data = { loggedIn: true, user };
      return JSON.stringify(data);
    } else {
      const data = { loggedIn: false };
      return JSON.stringify(data);
    }
  }

  @Post('/signout')
  logout(@Session() session: any) {
    session.userId = null;
    return 'Deslogado com sucesso!';
  }

  @Get('/test')
  @UseGuards(AuthGuard)
  currentUser(@CurrentUser() user: User) {
    return user;
  }

  @Get()
  findAll(@Query('email') email: string) {
    return this.userService.findBy(email);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
