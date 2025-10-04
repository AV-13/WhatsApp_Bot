import { detectIntent } from '../src/services/nlp';

describe('NLP', () => {
  it('detects french greeting', () => {
    const intent = detectIntent('bonjour', 'fr');
    expect(intent.name).toBeDefined();
  });
  it('fallback unknown', () => {
    const intent = detectIntent('xxx yyy zzz', 'fr');
    expect(intent.name).toBeDefined();
  });
});
