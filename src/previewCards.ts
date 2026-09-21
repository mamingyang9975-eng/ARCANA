import type { PromptCard } from './journeyState';

// Temporary, non-explicit content for reviewing the entrance and draw experience.
// Replace this collection with approved stage content before adding the full journey.
export const previewCards: Record<'self' | 'relationship', PromptCard[]> = {
  self: [
    { id: 'self-ground', title: '先在这里，停一会儿', prompt: '感受双脚与地面接触的地方。让身体找到一个舒服的位置，不急着改变什么。' },
    { id: 'self-breath', title: '听见自己的节奏', prompt: '留意一次自然的呼吸。它是缓慢的，还是有些急促？只是注意到它，就已经足够。' },
    { id: 'self-hands', title: '把注意力交给双手', prompt: '轻轻合拢双手，感受掌心的温度。此刻，你能用一个词描述这种感觉吗？' },
    { id: 'self-room', title: '为自己留一点空间', prompt: '看看周围，找到一个让你感到安定的事物。允许自己的目光在它身上多停留片刻。' },
    { id: 'self-shoulder', title: '找到一个放松的地方', prompt: '留意肩膀和背部的感觉。如果愿意，调整一下坐姿，让自己再舒服一点。' },
    { id: 'self-need', title: '此刻，我需要什么', prompt: '安静、温暖，还是一个小小的停顿？不必立刻找到答案，先听听自己的需要。' },
  ],
  relationship: [
    { id: 'pair-arrive', title: '一起抵达此刻', prompt: '轮流用一个词描述今天的自己。听完之后，先留一点安静，不急着给出建议。' },
    { id: 'pair-seen', title: '说一件被在意的小事', prompt: '回想一个具体的瞬间。告诉彼此，那件小事为什么让你感到被看见。' },
    { id: 'pair-listen', title: '我希望这样被倾听', prompt: '安静听完、问一个问题，或是给予回应：哪一种更接近你此刻的需要？' },
    { id: 'pair-space', title: '找到舒服的距离', prompt: '聊聊今天你们各自需要多少独处和陪伴。允许两个人的答案不一样。' },
    { id: 'pair-clarify', title: '再靠近真实的意思', prompt: '选一句曾经没说清楚的话。轮流补充当时的感受，再试着确认自己听见了什么。' },
    { id: 'pair-moment', title: '留住一个平常的瞬间', prompt: '分享一件你希望两个人继续保留的小事。它给这段关系带来了什么？' },
  ],
};
