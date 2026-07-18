export const GENERO_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "lgbtqia", label: "LGBTQIA+" },
  { value: "nao_responder", label: "Prefere não responder" },
] as const;

export const GENERO_LABEL: Record<string, string> = Object.fromEntries(
  GENERO_OPTIONS.map((o) => [o.value, o.label]),
);

export const RACA_OPTIONS = [
  "Branca",
  "Preta",
  "Parda",
  "Amarela",
  "Indígena",
  "Prefere não responder",
];

export const ESCOLARIDADE_OPTIONS = [
  "Não alfabetizado",
  "Fundamental incompleto",
  "Fundamental completo",
  "Médio incompleto",
  "Médio completo",
  "Superior incompleto",
  "Superior completo",
];

export const MATERIAIS_OPTIONS = [
  "Papel branco",
  "Papel misto",
  "Papelão",
  "Tetra Pak",
  "Plástico PET",
  "Plástico PEAD (rígido)",
  "Plástico filme",
  "Plástico misto",
  "Isopor (EPS)",
  "Sucata ferrosa",
  "Sucata branca (eletrodomésticos)",
  "Alumínio (latinha)",
  "Alumínio (perfil)",
  "Cobre",
  "Vidro incolor",
  "Vidro colorido",
  "Eletroeletrônicos",
  "Óleo de cozinha usado",
  "Pneus",
  "Pilhas e baterias",
  "Madeira",
  "Têxteis",
  "Outros",
];

export const NIVEL_GOV_BR_OPTIONS = ["Bronze", "Prata", "Ouro"];

export const RENDA_REFERENCIA = 1621; // salário mínimo nacional 2026 (referência)




export function maskCPF(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskPhone(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function isValidCPF(cpf: string) {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(c[10]);
}
