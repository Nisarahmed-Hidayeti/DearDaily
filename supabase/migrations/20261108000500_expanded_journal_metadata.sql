-- Extend existing private metadata allowlists; no row rewriting or permission changes.
alter table public.journal_entries drop constraint journal_entries_mood_check;
alter table public.journal_entries add constraint journal_entries_mood_check check(mood in ('Calm','Happy','Reflective','Low','Grateful','Hopeful','Excited','Proud','Energized','Content','Tired','Anxious','Overwhelmed','Lonely','Frustrated','Mixed'));
alter table public.journal_entries drop constraint journal_entries_category_check;
alter table public.journal_entries add constraint journal_entries_category_check check(category in ('Personal','Gratitude','Growth','Travel','Work','Study','Family','Friends','Health','Creativity','Dreams','Memories'));
