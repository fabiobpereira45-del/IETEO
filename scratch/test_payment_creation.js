const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");

const supabaseUrl = "https://plwqgvfbkjdnlzgljnef.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNTIxMiwiZXhwIjoyMDg4MDgxMjEyfQ.MRAysnDpPqxksxK3xIPWcd_PE9fvJMyA23i6Gl4H1VQ";
const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjNiYWM5NDVmLTEzNTktNGI5Zi05NmE2LTc4YzUxZWUzMzMxZjo6JGFhY2hfNzE2MTZhNDktMjkxNS00NmVlLWJjMGEtMDQyYTYzMzVlNDhk";
const baseUrl = "https://api.asaas.com/v3";

async function run() {
  try {
    // Fetch a student profile
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('*')
      .limit(1)
      .single();

    if (studentErr) {
      console.error("Erro ao buscar aluno:", studentErr);
      return;
    }

    console.log("Aluno selecionado:", student.name, "CPF:", student.cpf);

    // Search or create customer on Asaas
    console.log("Buscando cliente no Asaas...");
    const searchRes = await fetch(`${baseUrl}/customers?cpfCnpj=${student.cpf}`, {
        headers: { "access_token": apiKey }
    });
    const searchBody = await searchRes.json();
    console.log("Resultado da busca de cliente:", JSON.stringify(searchBody, null, 2));

    let asaasCustomerId = null;
    if (searchBody?.data?.length > 0) {
        asaasCustomerId = searchBody.data[0].id;
        console.log("Cliente já existe no Asaas. ID:", asaasCustomerId);
    } else {
        console.log("Criando cliente no Asaas...");
        const createCustomerRes = await fetch(`${baseUrl}/customers`, {
            method: "POST",
            headers: { "access_token": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
                name: student.name,
                cpfCnpj: student.cpf || "00000000000"
            })
        });
        const customerBody = await createCustomerRes.json();
        console.log("Resultado da criação de cliente:", JSON.stringify(customerBody, null, 2));
        if (!createCustomerRes.ok) {
            console.error("Erro ao criar cliente.");
            return;
        }
        asaasCustomerId = customerBody.id;
    }

    // Attempt to create a payment
    console.log("Criando pagamento no Asaas...");
    const createPaymentRes = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "access_token": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
            customer: asaasCustomerId,
            billingType: "PIX",
            value: 10.00,
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            description: "Teste de Integração IETEO"
        })
    });
    const paymentBody = await createPaymentRes.json();
    console.log("Resultado do pagamento:", JSON.stringify(paymentBody, null, 2));

    if (!createPaymentRes.ok) {
        console.error("Erro ao criar pagamento.");
        return;
    }

    const asaasPaymentId = paymentBody.id;

    // Get QR Code
    console.log("Buscando QR Code para o pagamento:", asaasPaymentId);
    const qrRes = await fetch(`${baseUrl}/payments/${asaasPaymentId}/pixQrCode`, {
        headers: { "access_token": apiKey }
    });
    const qrBody = await qrRes.json();
    console.log("Resultado QR Code:", JSON.stringify(qrBody, null, 2));

  } catch (err) {
    console.error("Erro geral:", err);
  }
}

run();
