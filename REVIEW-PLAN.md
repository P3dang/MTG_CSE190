Feedback from: Chenrui Liu

## Confusing
It is confusing that the scanner shows Rarity after a card is identified, but my collection does not show it. After reading server/index.js, server/schema.sql, and client/src/pages/Collection.jsx, it looks like rarity is returned only from /api/scan and never stored in the cards table, so the collection page has no way to display it. The quantity flow is also a little unclear at first glance: quantity can only be changed before saving in client/src/pages/Scanner.jsx, but there are no edit controls after the card is saved.

## Suggestion
I would prioritize the collection workflow next by adding edit or remove controls, decide which card metadata should be persisted, and make the collection page more informative before taking on the agent or public deck area. Right now the scanner is solid, but the collection is still mostly a read-only gallery, so the gap is in post-save management. A gotcha to flag is cost and latency. Every scan calls Claude, so a public live URL needs some kind of usage guard or at least a clear ceiling on how much scanning the team expects.

I would suggest add an inline control on client/src/pages/Collection.jsx to change quantity. That would make the collection page do something useful after save.


________________________
Feedback from Rosario 

## Confusion


## Suggestion
Develop an eval pipeline to test the accuracy of your card scanner using different models and prompts.
Try using OCR as an intermediate step to see if you can use fewer tokens / a cheaper model.
Add keyboard navigation to the UI
Add more visual contrast to the UI.
Add a form label to the card uploads page and give a semantic heading structure to your pages for accessibility.

______
## Staff review:

Here's our meta-review,

- Add a cost ceiling
- Add a separate eval for vision on MTG cards

___________

## Review Day Planing:

After discussing with my review day group mates, This was the plan we created. 

1.Make the collection page more usable:
- Right now cards in the collection are static, We want them to be editable incase there any errors in the translation
2.UI:
- Create better UI for the user by making the page more contrasting, and make it easier to navigate as a user. 
- Make the pages more accessible
3.Create an eval testing:
- Find the cost and stats of running different models 
4.Email Buggy:
- Right now users can log in without having to verify account


______
Review Day Planning Checklist:

Collection page: 
- Items inside the collection are now clickable, once clicked there is an option to edit the inforation, such as quanity, name, type, rarity, and other relevant cards inforation. 

UI & Accessibility:

Eval Testing:

Email Issue:


____________
Response to All the feedback:

Response to Chenrui Liu:

Rarity was not being stored or shown in the collection. This has been fixed — rarity is now saved to the database and displayed on the collection page with color coding based on the rarity tier. We also added the ability to edit cards directly in the collection by clicking on them. You can now update the name, type, set, rarity, and quantity, or remove the card entirely. For the cost concern, we added a daily scan limit per user. Once a user hits the limit they get an error message and scans reset at midnight. The limit is set to 20 by default but can be changed in the server settings.

Response to Rosario:

We built an eval script that tests how accurately each Claude model identifies cards from photos. It runs the same set of test images through multiple model and prompt combinations and prints a table comparing accuracy, token usage, cost, and speed. We also added OCR as an alternative approach in the eval — OCR reads the text off the card image and either looks it up on Scryfall directly (no Claude cost at all) or sends just the text to a cheaper model. This lets us see whether OCR is good enough to replace the vision API and how much money it saves. For the UI feedback, we improved the contrast across both pages by lightening the borders, labels, and text so they are easier to read. Keyboard navigation was added to the collection page — arrow keys move between cards and Escape closes the detail panel. For accessibility, all section titles are now proper heading elements, the file upload has a label, and all form fields and buttons have descriptive labels for screen readers.

Response to Staff:

The cost ceiling and the MTG vision eval have both been completed. See the responses above for details on each.

