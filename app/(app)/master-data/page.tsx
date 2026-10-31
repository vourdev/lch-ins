import { redirect } from "next/navigation"

/**
 * Master Data tidak punya halaman sendiri; tiap bagiannya beralamat sendiri di
 * submenu sidebar. Menu induk dan tautan lama ke /master-data mendarat di
 * bagian pertama.
 */
export default function MasterDataPage() {
  redirect("/master-data/cob")
}
