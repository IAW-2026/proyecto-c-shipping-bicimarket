import type { Address } from "./common";

/**
 * Vendedor o comprador "conocido" por la app — derivado de los datos que ya
 * existen en la DB (snapshots de envíos/grupos). En sprint 1 no tenemos un
 * catálogo real de Seller/Buyer, así que la fuente de verdad para el form de
 * "nuevo pedido" es lo que ya fue creado. Cada party trae su dirección más
 * reciente para auto-cargarla (read-only) al elegirlo.
 */
export interface PartyDTO {
  id: string; // slp_… (seller) | byp_… (buyer)
  label: string; // texto a mostrar en el select
  name?: string; // receiver_name (solo buyers)
  address: Address;
}

export interface AdminPartiesDTO {
  sellers: PartyDTO[];
  buyers: PartyDTO[];
}
