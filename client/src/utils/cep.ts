export type CepAddress = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
};

export function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatPostalCode(value?: string) {
  return formatCep(value ?? '');
}

export async function lookupCep(cep: string): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) throw new Error('Não foi possível consultar o CEP.');
  const data = (await response.json()) as {
    erro?: boolean;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    complemento?: string;
  };
  if (data.erro) return null;
  return {
    street: data.logradouro?.trim() ?? '',
    neighborhood: data.bairro?.trim() ?? '',
    city: data.localidade?.trim() ?? '',
    state: (data.uf ?? '').trim().toUpperCase(),
    complement: data.complemento?.trim() ?? '',
  };
}
