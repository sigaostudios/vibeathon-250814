import { TestBed } from '@angular/core/testing';
import { BranchSpyService } from './branch-spy.service';

describe('BranchSpyService', () => {
  let service: BranchSpyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BranchSpyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch commit from prompt-puppies branch', (done) => {
    service.getLatestCommitFromPromptPuppies().subscribe(commitInfo => {
      if (commitInfo) {
        expect(commitInfo.message).toBeDefined();
        expect(commitInfo.sha).toBeDefined();
        expect(commitInfo.author).toBeDefined();
        expect(commitInfo.date).toBeDefined();
        console.log('Latest commit from prompt-puppies:', commitInfo.message);
      }
      done();
    });
  }, 10000);

  it('should fetch commit message as string', (done) => {
    service.getLatestCommitMessage().subscribe(message => {
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
      console.log('Commit message:', message);
      done();
    });
  }, 10000);
});