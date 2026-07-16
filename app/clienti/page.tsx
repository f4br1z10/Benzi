import CustomerManager from "@/components/CustomerManager";
export default async function CustomersPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const p=await searchParams;return <><div className="page-header"><div><h1>Clienti</h1><p>Anagrafiche, indirizzi di installazione e storico preventivi.</p></div></div><CustomerManager openInitially={p.new==="1"}/></>}
