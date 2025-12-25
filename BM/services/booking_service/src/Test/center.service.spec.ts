import { Test, TestingModule } from '@nestjs/testing';
import { CenterService } from '../Service/center.service';
import { getModelToken } from '@nestjs/mongoose';
import { Center } from '../Schema/center.schema';

const createMockQuery = (returnValue: any) => {
  const query: any = {};
  query.findOne = jest.fn().mockReturnThis();
  query.exec = jest.fn().mockResolvedValue(returnValue);
  return query;
};

const mockCenterModel = {
  findOne: jest.fn(),
};

describe('CenterService', () => {
  let service: CenterService;
  let model: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CenterService,
        {
          provide: getModelToken(Center.name),
          useValue: mockCenterModel,
        },
      ],
    }).compile();

    service = module.get<CenterService>(CenterService);
    model = module.get(getModelToken(Center.name));

    jest.clearAllMocks();
  });

  describe('findCenterPricingById', () => {
    
    it('should return pricing if center is found', async () => {
      const mockCenter = {
        centerId: 'center_123',
        pricing: { weekday: [], weekend: [] }
      };

      mockCenterModel.findOne.mockReturnValue(createMockQuery(mockCenter));

      const result = await service.findCenterPricingById('center_123');

      expect(result).toEqual(mockCenter.pricing);
      expect(mockCenterModel.findOne).toHaveBeenCalledWith({ centerId: 'center_123' });
    });

    it('should throw error if center is not found', async () => {

      mockCenterModel.findOne.mockReturnValue(createMockQuery(null));


      await expect(service.findCenterPricingById('invalid_id')).rejects.toThrow();
    });
  });
});