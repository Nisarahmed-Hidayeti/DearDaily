export type Visibility = 'Private' | 'Public'
export type Mood = 'Calm' | 'Happy' | 'Reflective' | 'Low'
export interface Tag { name: string }
export interface Author { name: string; initials: string }
export interface Entry { id: string; title: string; body: string; date: string; visibility: Visibility; mood: Mood; tags: Tag[] }
export interface Story extends Entry { author: Author; category: string; scene: string; minutes: number }
export const entries: Entry[] = [
 {id:'morning',title:'The quiet before the world wakes',body:'An open window, a warm cup, and a few minutes that belonged only to me. Today, that was enough.',date:'October 26, 2026',visibility:'Private',mood:'Calm',tags:[{name:'small moments'}]},
 {id:'progress',title:'Learning to take the long way',body:'I took a different path home today. Sometimes a small detour is all it takes to see things differently.',date:'October 25, 2026',visibility:'Public',mood:'Reflective',tags:[{name:'growth'}]},
 {id:'wins',title:'A little list of good things',body:'A conversation that stayed with me. Finishing a difficult chapter. The light on the kitchen wall.',date:'October 23, 2026',visibility:'Private',mood:'Happy',tags:[{name:'gratitude'}]},
]
export const stories: Story[] = [
 {...entries[1],id:'long-way',title:'There is no hurry to become',body:'I used to measure my days by how much I finished. Lists became longer, evenings became shorter, and somewhere along the way I forgot to look up.\n\nLast Sunday, I walked without a destination. The trees were turning. A stranger held a door. Nothing remarkable happened, and I remember all of it.\n\nMaybe growing is also learning what to leave unfinished. Giving the ordinary things enough room to feel extraordinary.',author:{name:'Lena Rivers',initials:'LR'},category:'Personal growth',scene:'mountains',minutes:3},
 {...entries[0],id:'windows',title:'A window, a cup, a new beginning',body:'The first morning in a new city felt impossibly quiet. I made coffee and watched the windows across the street light up.\n\nIt helped to remember that everyone was beginning their own ordinary day. I could begin mine too.',visibility:'Public',author:{name:'Milo Chen',initials:'MC'},category:'Everyday life',scene:'window',minutes:2},
 {...entries[2],id:'night',title:'What the night sky taught me',body:'Beyond the last streetlight, the sky opened up. I had forgotten how many stars there were.\n\nFor a while, I stopped trying to make sense of everything. I stood still and let the evening be bigger than my worries.',visibility:'Public',author:{name:'Ada Noor',initials:'AN'},category:'Reflections',scene:'stars',minutes:4},
]
