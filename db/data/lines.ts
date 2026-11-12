// Dados das linhas, transcritos dos PDFs de horários da Secretaria.
// Este arquivo é só dados: não acessa banco nem internet.

export type StopData = {
  street: string; // rua/praça, usada para achar a coordenada
  number?: string; // número do imóvel, quando houver
  reference: string; // referência do ponto, como no PDF
  offset: number; // minutos depois da saída do terminal
};

export type LineData = {
  code: string;
  name: string;
  color: string;
  weekdayDepartures: string[]; // segunda a sexta
  saturdayDepartures: string[];
  returnOffset: number; // minutos até a volta ao terminal (ainda não usado)
  stops: StopData[];
};

export type Coordinate = {
  latitude: number | null;
  longitude: number | null;
  // endereco = achou o número | rua = só a rua (aproximado)
  // nenhum = não achou | manual = você corrigiu
  precision: "endereco" | "rua" | "nenhum" | "manual";
  found: string;
};

// Chave para achar a coordenada: rua + número
export function addressKey(stop: StopData): string {
  return `${stop.street}|${stop.number ?? ""}`;
}

// Chave para identificar a parada (mesma parada em linhas diferentes)
export function stopKey(stop: StopData): string {
  return `${stop.street}|${stop.number ?? ""}|${stop.reference}`;
}

// Nome mostrado no mapa
export function stopName(stop: StopData): string {
  const address = stop.number ? `${stop.street}, ${stop.number}` : stop.street;
  return `${stop.reference} (${address})`;
}

const TERMINAL: StopData = {
  street: "Praça Martin Moreira",
  reference: "Rodoviária",
  offset: 0,
};

const WEEKDAY = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
];
const SATURDAY = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
];

export const lines: LineData[] = [
  {
    code: "SUL",
    name: "Eixo Sul - Bom Jardim",
    color: "#16a34a",
    weekdayDepartures: WEEKDAY,
    saturdayDepartures: SATURDAY,
    returnOffset: 59,
    stops: [
      TERMINAL,
      { street: "Rua Floriano Peixoto", number: "652", reference: "Salgadaria Maretta", offset: 5 },
      { street: "Rua Floriano Peixoto", number: "425", reference: "Posto CSIII", offset: 7 },
      { street: "Rua Floriano Peixoto", number: "186", reference: "Delegacia", offset: 9 },
      { street: "Rua Carlos Gomes", reference: "Chácara Boleta", offset: 12 },
      { street: "Rua Carlos Gomes", reference: "Entrada Quebec", offset: 14 },
      { street: "Avenida das Acácias", number: "630", reference: "Academia Bom Jardim", offset: 18 },
      { street: "Avenida das Acácias", number: "970", reference: "Entrada Pesqueiro", offset: 18 },
      { street: "Vicinal Armando Scozzafave", reference: "Condominio Amestista", offset: 20 },
      { street: "Rua Natal Angelo Rufato", reference: "Atrás Mult Beef", offset: 24 },
      { street: "Rua Irmã Santina", number: "158", reference: "Caixa D'Água Miranda", offset: 26 },
      { street: "Vicinal Armando Scozzafave", reference: "Paulinho Choperia", offset: 28 },
      { street: "Avenida Rebouças", number: "86", reference: "Supermercado Nori", offset: 30 },
      { street: "Rua Elias Barquete", number: "80", reference: "Sobradinho", offset: 32 },
      { street: "Rua Elias Barquete", number: "233", reference: "Hospitalzinho", offset: 32 },
      { street: "Rua Olieno Stoppa Honorato", number: "95", reference: "Fisioterapia", offset: 34 },
      { street: "Rua Antônio Adami", number: "222", reference: "Cohab I", offset: 36 },
      { street: "Rua Barão do Rio Branco", number: "518", reference: "Supermercados 3J", offset: 38 },
      { street: "Rua Altino Arantes", reference: "WR Lava Rápido", offset: 40 },
      { street: "Rua Dr. Faustino de Castro", number: "200", reference: "Gota Dourada", offset: 42 },
      { street: "Rua Alfredo Bueno", number: "771", reference: "Fabrica Milk", offset: 44 },
      { street: "Rua Maria Olímpia P. Furlam", number: "31", reference: "Bar do Fernando", offset: 46 },
      { street: "Rua Altair Perez", number: "51", reference: "Jardim Primavera", offset: 48 },
      { street: "Rua Reinaldo A. Toloi", number: "270", reference: "Palmeira", offset: 50 },
      { street: "Rua Davi Grandi", number: "161", reference: "Abacateiro", offset: 52 },
      { street: "Rua Davi Grandi", number: "480", reference: "Padaria Diniz", offset: 52 },
      { street: "Rua João Elias Saad", number: "315", reference: "Escola Elza Leite", offset: 54 },
      { street: "Avenida Champagnat", number: "601", reference: "Fábrica Costura Frata", offset: 56 },
      { street: "Avenida Champagnat", number: "333", reference: "Bar do Cowboy", offset: 56 },
      { street: "Rua Vereador José Sabino", number: "625", reference: "Nosso Supermercado", offset: 58 },
    ],
  },
  {
    code: "NORTE",
    name: "Eixo Norte - CDHU",
    color: "#ea580c",
    weekdayDepartures: WEEKDAY,
    saturdayDepartures: SATURDAY,
    returnOffset: 58,
    stops: [
      TERMINAL,
      { street: "Rua Floriano Peixoto", number: "1378", reference: "Escola Tiradentes", offset: 2 },
      { street: "Rua Floriano Peixoto", number: "1954", reference: "Lar da Fraternidade", offset: 2 },
      { street: "Rua José Fabri", number: "357", reference: "Lions", offset: 4 },
      { street: "Avenida Papa João XXIII", number: "570", reference: "Ricardo Cabelereiro", offset: 6 },
      { street: "Rua Pedro Grandi", reference: "Lava Rápido (City)", offset: 8 },
      { street: "Rua Pedro Grandi", number: "490", reference: "Árvore Paineira", offset: 8 },
      { street: "Rua Delelmo Mantovani", number: "861", reference: "Coqueirinho", offset: 10 },
      { street: "Rua Francisca Soares", number: "622", reference: "Barracao vermelho", offset: 12 },
      { street: "Rua Maria F. Carvalho", number: "4", reference: "Esquina Chácara", offset: 14 },
      { street: "Rua Antônio Francisco Pizzi", number: "110", reference: "Campo Pernambuco", offset: 16 },
      { street: "Rua Antônio Francisco Pizzi", number: "428", reference: "Igreja Madureira", offset: 16 },
      { street: "Rua Antônio Francisco Pizzi", number: "685", reference: "Bar do Japão", offset: 16 },
      { street: "Rua Cinício Teixeira Roque", number: "814", reference: "Paulinho Motos", offset: 18 },
      { street: "Rua Cinício Teixeira Roque", reference: "Campo de futebol", offset: 18 },
      { street: "Rua Palmiro Martini", number: "100", reference: "Praça do CDHU", offset: 20 },
      { street: "Rua Élio Lascalla", number: "274", reference: "Creas", offset: 22 },
      { street: "Rua Élio Lascalla", number: "34", reference: "Pizzaria Amarildo", offset: 22 },
      { street: "Rua José Rozini", number: "213", reference: "Caixa D'Água Fortaleza", offset: 24 },
      { street: "Rua José Rozini", number: "766", reference: "Mini mercado Fortaleza", offset: 24 },
      { street: "Rua Bortoloto Perez", reference: "Banquinho de madeira", offset: 26 },
      { street: "Rua Arminio Monteverde", number: "75", reference: "Posto de saúde Mendonça", offset: 28 },
      { street: "Rua Oswaldo Cruz", number: "160", reference: "Depósito Bebidas Caetano", offset: 30 },
      { street: "Rua Oswaldo Cruz", number: "142", reference: "UBS DR Luiz Brisoti", offset: 30 },
      { street: "Rua Olavo Bilac", number: "20", reference: "Casa de Tintas", offset: 32 },
      { street: "Rua Vereador José Sabino", number: "1.417", reference: "Escola JASP", offset: 34 },
      { street: "Rua Benjamin Constant", number: "244", reference: "André Supermercados", offset: 36 },
      { street: "Rua 15 de Novembro", number: "73", reference: "APAE", offset: 38 },
      { street: "Rua Dário de Oliveira", number: "261", reference: "Martinico", offset: 40 },
      { street: "Rua Antônio Alves Ferreira", number: "18", reference: "Fábrica de amendoim", offset: 42 },
      { street: "Rua Antônio Alves Ferreira", number: "821", reference: "Bar do Branco", offset: 45 },
      { street: "Estrada Vicinal Jardinópolis", number: "9", reference: "Condomínio Esmeralda", offset: 47 },
      { street: "Rua João Gonçalves Sardinha", number: "501", reference: "Posto de Saúde Euclides", offset: 50 },
      { street: "Rua João Gonçalves Sardinha", number: "211", reference: "Capelinha São Judas", offset: 53 },
      { street: "Rua Capitão João Pereira Ramos", number: "499", reference: "Supermercado 3J", offset: 55 },
      { street: "Rua Capitão João Pereira Ramos", number: "81", reference: "Supermercado Cristal", offset: 55 },
    ],
  },
];