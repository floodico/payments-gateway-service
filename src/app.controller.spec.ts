import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: DataSource, useValue: dataSource }],
    }).compile();

    controller = module.get(AppController);
  });

  it('returns ok when database is reachable', async () => {
    await expect(controller.health()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('throws when database is down', async () => {
    dataSource.query.mockRejectedValue(new Error('connection refused'));

    await expect(controller.health()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
