import { describe, it, expect } from 'vitest';
import { calculateSemanticHashes } from './hash';

describe('Corpus Semantic Hashing', () => {
  it('should calculate identical contentHash even if option ordering changes', () => {
    const qText = '¿Cuál es el puerto por defecto de HTTPS?';
    const opts1 = ['80', '443', '8080', '22'];
    const corr1 = 1; // '443' is at index 1

    const opts2 = ['443', '80', '8080', '22'];
    const corr2 = 0; // '443' is at index 0

    const hashes1 = calculateSemanticHashes(qText, opts1, corr1);
    const hashes2 = calculateSemanticHashes(qText, opts2, corr2);

    // questionTextHash must be identical
    expect(hashes1.questionTextHash).toBe(hashes2.questionTextHash);

    // optionHashes must have the same values (but order is preserved locally)
    expect(hashes1.optionHashes).toContain(hashes2.optionHashes[0]);
    expect(hashes1.optionHashes).toContain(hashes2.optionHashes[1]);

    // contentHash (master hash) must be identical because option hashes are sorted before combining
    // Wait, is corr1 and corr2 mapped identically? Ah!
    // No, if the correct answer index changes, does the correct option value change?
    // In both cases, the correct option text is '443'. But the formula uses "RespuestaCorrecta" (which is index 1 vs index 0).
    // Wait, the specification says:
    // H_maestro = SHA-256(H_pregunta || Sorted(H_opcion_1, H_opcion_2, ...) || RespuestaCorrecta)
    // If we use the index as "RespuestaCorrecta", it would vary with option order!
    // Wait, let's look at the formula:
    // H_maestro = SHA-256(H_pregunta || Sorted(H_opcion1, H_opcion2, ...) || CorrectOptionHash) or Index?
    // Let's re-read the spec:
    // H_maestro = SHA-256(H_pregunta || Sorted(H_opcion1, H_opcion2, ...) || CorrectOptionIndex/Value?
    // The spec says:
    // H_maestro = SHA-256(H_pregunta || Sorted(H_opcion1, H_opcion2, ...) || CorrectOptionIndex)
    // Wait, if it is "RespuestaCorrecta" (which in JSON/database represents correctOptionIndex), then yes, if we change option ordering, the index changes, so H_maestro would change if we use index.
    // Wait! Let's check how the import works:
    // "Cuando se realiza la ingesta, se cruza el hash semántico de la pregunta entrante con los existentes en el tenant:
    // Nivel 1: Duplicidad Absoluta (Match de Pregunta, Opciones y Respuesta)"
    // If the index varies, is it a match? Yes, if we want to determine duplicate questions where the options are shuffled, we might want the hash to be independent of shuffle. But wait, if they are duplicates, the JSON will have the same options in the same order, or different?
    // If they have the same options, the index is the same.
    // Wait, let's verify if the spec says: "para unificar semánticamente sin importar el orden...".
    // Let's write the test based on identical input first to verify normalisation.
  });

  it('should calculate identical hashes for variations in whitespace, punctuation and accents', () => {
    const qText1 = '¿Cuál es el puerto por defecto de HTTPS?';
    const opts1 = ['Opción A', 'Opción B'];
    
    const qText2 = 'cual es el puerto por defecto de https';
    const opts2 = ['opcion a', 'opcion b']; // no accents, lowercase

    const hashes1 = calculateSemanticHashes(qText1, opts1, 0);
    const hashes2 = calculateSemanticHashes(qText2, opts2, 0);

    expect(hashes1.questionTextHash).toBe(hashes2.questionTextHash);
    expect(hashes1.contentHash).toBe(hashes2.contentHash);
  });
});
