import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/prisma";
import { generateQuotePdf } from "@/server/pdf";
import { handleApiError, jsonError } from "@/lib/http";
type Context={params:Promise<{id:string}>};
export async function POST(_:NextRequest,{params}:Context){try{return NextResponse.json(await generateQuotePdf(Number((await params).id)))}catch(error){return handleApiError(error,"generazione PDF")}}
export async function GET(_:NextRequest,{params}:Context){const quote=await prisma.quote.findUnique({where:{id:Number((await params).id)}});if(!quote?.lastPdfPath)return jsonError("Genera prima il PDF.",404);try{const bytes=await fs.readFile(quote.lastPdfPath);return new NextResponse(bytes,{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${encodeURIComponent(path.basename(quote.lastPdfPath))}"`,"Cache-Control":"no-store"}})}catch{return jsonError("PDF non disponibile: rigeneralo.",404)}}
