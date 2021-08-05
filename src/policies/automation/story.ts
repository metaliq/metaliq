export type Story = {
  scenes: StoryScene[]
}

export type StoryEvent = {
  elements: {
    trigger: string
    handle: string
  }
  type: string
  data?: any
}

export type StoryUpdate = {
  update: {
    path: string
    key: string
  }
  data: {
    path: string
  }
}

export type StoryScene = {
  captions?: {
    command?: string
    complete?: string
  }
  event?: StoryEvent
  update?: StoryUpdate
  next?: StoryScene[]
}
