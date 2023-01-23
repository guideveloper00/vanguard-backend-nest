import { UserService } from './user.service';
import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common/exceptions';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(private userService: UserService) {}

  async signup(email: string, password: string, recaptchaToken: string) {
    const users = await this.userService.findBy(email);

    if (users.length) {
      throw new BadRequestException(`Email ${users[0].email} already exists`);
    }

    const salt = randomBytes(8).toString('hex');

    const hash = (await scrypt(password, salt, 32)) as Buffer;

    const result = `${hash.toString('hex')}.${salt}`;

    const hashedUser = { email, password: result, recaptchaToken };

    const user = await this.userService.create(hashedUser);

    return user;
  }

  async signin(email: string, password: string) {
    const users = await this.userService.findBy(email);

    if (!users) {
      throw new NotFoundException('user not found');
    }

    const userPassword = users[0].password;

    const salt = userPassword.split('.')[1];
    const storedHash = userPassword.split('.')[0];

    const hash = (await scrypt(password, salt, 32)) as Buffer;

    if (hash.toString('hex') !== storedHash) {
      throw new BadRequestException('bad password');
    }

    return users[0];
  }
}
