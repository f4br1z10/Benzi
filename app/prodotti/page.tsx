import ProductManager from "@/components/ProductManager";
export default async function ProductsPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const p=await searchParams;return <><div className="page-header"><div><h1>Prodotti</h1><p>Catalogo, prezzi, costi interni e schede tecniche.</p></div></div><ProductManager openInitially={p.new==="1"}/></>}
