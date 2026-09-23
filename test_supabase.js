import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jmofbduttsrnihiiqjru.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptb2ZiZHV0dHNybmloaWlxanJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NzEyODUsImV4cCI6MjEwNDA0NzI4NX0.DN55W3etb094zBt4BmTl5ldz1r9wJ4J1PDnJ-whc-t8'
)

async function run() {
  console.log("Checking Unidades...");
  const { data: unidades, error: errU } = await supabase.from('unidades').select('*');
  console.log("Unidades:", unidades, "Error:", errU);

  console.log("Checking vw_risco_atual...");
  const { data: vw, error: errV } = await supabase.from('vw_risco_atual').select('*');
  console.log("vw_risco_atual:", vw, "Error:", errV);
}

run();
