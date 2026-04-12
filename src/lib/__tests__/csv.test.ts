import { describe, it, expect } from 'vitest';
import { toCsv } from '../csv';

describe('toCsv', () => {
  it('gera CSV simples', () => {
    const csv = toCsv(['Nome', 'Idade'], [['João', '30'], ['Maria', '25']]);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[0]).toBe('Nome,Idade');
    expect(lines[1]).toBe('João,30');
    expect(lines[2]).toBe('Maria,25');
  });

  it('escapa campos com vírgula', () => {
    const csv = toCsv(['Col'], [['valor, com vírgula']]);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[1]).toBe('"valor, com vírgula"');
  });

  it('escapa campos com aspas', () => {
    const csv = toCsv(['Col'], [['valor "com" aspas']]);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[1]).toBe('"valor ""com"" aspas"');
  });

  it('inclui BOM para Excel', () => {
    const csv = toCsv(['A'], [['1']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('lida com campos vazios', () => {
    const csv = toCsv(['A', 'B'], [['', '']]);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[1]).toBe(',');
  });
});
