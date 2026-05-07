const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- DIAGNÓSTICO DE BANCO DE DADOS ---');
  try {
    const patients = await prisma.patient.count();
    console.log('✅ Conexão com Banco de Dados: OK');
    console.log(`✅ Total de Pacientes: ${patients}`);
    
    try {
      await prisma.periodontalChart.findMany();
      console.log('✅ Tabela PeriodontalChart: EXISTE');
    } catch (e) {
      console.log('❌ Tabela PeriodontalChart: NÃO ENCONTRADA OU ERRO');
      console.error(e.message);
    }

    try {
      await prisma.attachment.findMany();
      console.log('✅ Tabela Attachment: EXISTE');
    } catch (e) {
      console.log('❌ Tabela Attachment: NÃO ENCONTRADA OU ERRO');
      console.error(e.message);
    }

  } catch (error) {
    console.log('❌ ERRO GERAL DE CONEXÃO');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
