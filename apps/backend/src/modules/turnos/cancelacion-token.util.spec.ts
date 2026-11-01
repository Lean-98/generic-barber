import { generarTokenCancelacion, urlCancelacion, verificarTokenCancelacion } from './cancelacion-token.util';

describe('cancelacion-token.util', () => {
  const SECRETO = 'secreto-test';

  it('should round-trip the turno id', () => {
    expect(verificarTokenCancelacion(generarTokenCancelacion(42, SECRETO), SECRETO)).toBe(42);
  });

  it('should be deterministic so confirmation and reminder share the same link', () => {
    expect(generarTokenCancelacion(7, SECRETO)).toBe(generarTokenCancelacion(7, SECRETO));
  });

  it('should reject a token signed with another secret', () => {
    expect(verificarTokenCancelacion(generarTokenCancelacion(42, 'otro'), SECRETO)).toBeNull();
  });

  it('should reject a token whose id was swapped for another turno', () => {
    const firma = generarTokenCancelacion(42, SECRETO).split('.')[1];
    expect(verificarTokenCancelacion(`43.${firma}`, SECRETO)).toBeNull();
  });

  it.each([undefined, null, '', 'abc', '42', '42.', '.firma', '-1.x', '1.2.3', 'x.y'])(
    'should reject malformed token %p',
    (token) => {
      expect(verificarTokenCancelacion(token as any, SECRETO)).toBeNull();
    },
  );

  it('should build the public URL without doubling slashes', () => {
    const url = urlCancelacion('https://barber.test/', 5, SECRETO);
    expect(url).toBe(`https://barber.test/cancelar-turno?token=${generarTokenCancelacion(5, SECRETO)}`);
  });
});
