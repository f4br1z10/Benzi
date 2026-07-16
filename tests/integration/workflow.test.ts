import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/prisma";
import { createQuote, changeQuoteStatus, duplicateQuote } from "@/server/quotes";
import { createBackup } from "@/server/backup";
import { generateQuotePdf } from "@/server/pdf";

const key=`TEST-${Date.now()}`;let customerId=0,productId=0,serviceId=0,categoryId=0,quoteId=0,duplicateId=0;
describe.sequential("flusso database completo",()=>{
  beforeAll(async()=>{const category=await prisma.category.upsert({where:{slug:"test-automatici"},update:{active:true},create:{name:"Test automatici",slug:"test-automatici",position:99}});categoryId=category.id});
  it("crea e modifica un cliente",async()=>{const c=await prisma.customer.create({data:{type:"PRIVATO",firstName:"Cliente",lastName:key,email:`${key.toLowerCase()}@example.com`,addresses:{create:{type:"INSTALLAZIONE",city:"Roma",isDefault:true}}}});customerId=c.id;const updated=await prisma.customer.update({where:{id:c.id},data:{phone:"060000000"}});expect(updated.phone).toBe("060000000")});
  it("crea un prodotto",async()=>{const p=await prisma.product.create({data:{internalCode:key,name:"Prodotto di test",categoryId,salePriceInclVatCents:12200,salePriceExclVatCents:10000,purchaseCostCents:5000,vatRate:22}});productId=p.id;expect(p.internalCode).toBe(key)});
  it("crea un servizio",async()=>{const s=await prisma.service.create({data:{name:`Servizio ${key}`,categoryId,defaultPriceCents:6100,vatRate:22}});serviceId=s.id;expect(s.defaultPriceCents).toBe(6100)});
  it("crea un preventivo con tre righe e promemoria",async()=>{const quote=await createQuote({customerId,categoryId,status:"BOZZA",quoteDate:new Date(),validityDays:30,seller:"Test",subject:"Preventivo test",deliveryTime:"10 giorni",paymentMethod:"Bonifico bancario",paymentConditions:"50/50",depositPercent:50,financingAvailable:false,incentive:"Nessun incentivo",fiscalNote:"",visibleNotes:"",additionalConditions:"",attachmentMode:"NESSUNO",items:[{type:"PRODOTTO",productId,position:0,description:"Prodotto",quantity:1,unit:"pz",unitPriceCents:12200,priceIncludesVat:true,discountPercent:0,discountFixedCents:0,vatRate:22,purchaseCostCents:5000},{type:"SERVIZIO",serviceId,position:1,description:"Servizio",quantity:2,unit:"ore",unitPriceCents:6100,priceIncludesVat:true,discountPercent:0,discountFixedCents:0,vatRate:22,purchaseCostCents:0},{type:"LIBERA",position:2,description:"Riga libera",quantity:1,unit:"corpo",unitPriceCents:1000,priceIncludesVat:true,discountPercent:0,discountFixedCents:0,vatRate:22,purchaseCostCents:0}]});quoteId=quote.id;expect(quote.items).toHaveLength(3);expect(quote.totalCents).toBe(25400);expect(await prisma.quoteReminder.count({where:{quoteId}})).toBe(1)});
  it("cambia stato e registra la cronologia",async()=>{await changeQuoteStatus(quoteId,"EMESSO","Test emissione");expect((await prisma.quote.findUniqueOrThrow({where:{id:quoteId}})).status).toBe("EMESSO");expect(await prisma.quoteStatusHistory.count({where:{quoteId}})).toBeGreaterThanOrEqual(2)});
  it("duplica il preventivo",async()=>{const copy=await duplicateQuote(quoteId);duplicateId=copy.id;expect(copy.status).toBe("BOZZA");expect(copy.items).toHaveLength(3)});
  it("genera un PDF non vuoto",async()=>{const target=path.resolve("output/pdf/test-preventivo.pdf");const result=await generateQuotePdf(quoteId,target);expect(result.size).toBeGreaterThan(10000);expect((await fs.stat(target)).size).toBeGreaterThan(10000)});
  it("esporta un backup ZIP",async()=>{const target=await createBackup(path.resolve("storage/backups/test-backup.zip"));expect((await fs.stat(target)).size).toBeGreaterThan(1000)});
  afterAll(async()=>{if(duplicateId)await prisma.quote.delete({where:{id:duplicateId}}).catch(()=>{});if(quoteId)await prisma.quote.delete({where:{id:quoteId}}).catch(()=>{});if(productId)await prisma.product.delete({where:{id:productId}}).catch(()=>{});if(serviceId)await prisma.service.delete({where:{id:serviceId}}).catch(()=>{});if(customerId)await prisma.customer.delete({where:{id:customerId}}).catch(()=>{});await prisma.$disconnect()});
});
