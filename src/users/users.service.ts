import { Injectable } from '@nestjs/common';
import type { User } from './interfaces/user.interface';
import type { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private users: User[] = [];
  private idCounter = 1;

  create(createUserDto: CreateUserDto): User {
    const newUser: User = {
      id: this.idCounter++,
      name: createUserDto.name,
      email: createUserDto.email,
    };
    this.users.push(newUser);
    return newUser;
  }

  findAll(): User[] {
    return [...this.users];
  }

  findOne(id: number): User | undefined {
    return this.users.find((user) => user.id === id);
  }
}
