import { pullData } from '../shopify/cli-wrapper'

export type PullCommandArgs = {
  store: string
  theme: number
}

export default async function pullCommand(args: PullCommandArgs) {
  await pullData(args.store, args.theme)
  // TODO: Display success message
}
