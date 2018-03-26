import { TestBed, inject } from '@angular/core/testing';

import { IotaService } from './iota.service';

describe('IotaService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IotaService]
    });
  });

  it('should be created', inject([IotaService], (service: IotaService) => {
    expect(service).toBeTruthy();
  }));
});
