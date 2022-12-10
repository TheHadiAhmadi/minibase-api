import { deployProject } from "$lib/runner/deploy";
import { respond } from "$lib/server/services";
import type { RequestEvent } from "./$types";

export async function POST({ request, params }: RequestEvent) {
    const name = params.project
    const data = await deployProject(name)
    
    return respond({data})
}
