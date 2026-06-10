Title: MTG Scry Forge

One sentence description – “Receipt scanner on Google Cloud (Ship it with auth + live URL)”, “Game Master for Werewolf (Generation as the point)”, “Private CSE tutor installed on ieng6 (Run it fully on your laptop)”. The description should make it obvious which of the above options you've chosen

MTG card scanner with deck builder agent using google authentication  ( Ship it with auth + live URL ) 

Past project reference – Indicate which assignment + student's past project is the base, if any. With permission from the other partner, partners can extend the past project submission from a group. Include a github link (if a truly new project, make a stub github repository and link that).

I will be using my MTG deck building agent from project 3 in this project. I will need to create a document scanner that works for mtg cards. 

Github link: https://github.com/ucsd-cse-genai-programming-sp26/03-agents-phuoc-a3

Planned technologies – What frameworks, platforms, etc do you plan to use? It's fine to give multiple options for a category.

I’m planning on using Claude API for the LLM and OpenAI Agents SDK for the agent framework. Similarly to my assignment 3 I’m using Scryfall API for mtg card information. I’m planning on using SQLite for my database and basic HTML/REACT for my frontend.

First deliverable – What is the first thing you will build? Focus on a single user story/workflow, or as small a set of them as you can. What will force you to look at all the parts of your application in at least some way?
The first deliverable that I will implement is the document scanner.  The user will be able to upload a  photo of a Magic: the gathering card, the scanner will identify the card,  then the card will be saved into that individual's own database. Assignment 2 makes you look at the entire stack, since there has to be a frontend that holds the scanner, a backend to store the data, and personal accounts for individuals privacy. Claude API will help identify the card and the scryfall api will help give the card an "ID" tag. 
For my assignment 2 I created a menu scanner.
Rough architecture for first deliverable – What components and data will be involved? A component is often best described like a function call – what inputs does each component take, what output does it produce, what effects does it have? Data could be the database shape or an application-specific kind of data (like the ReceiptUpdate type or the representation of git commands for gitbot). Don't talk about individual Python helper functions, but try to explain your system in terms of 5-10 major components.

Read Card: This will take in an image as an input and the output would be a new added card into a users database. 

Google Auth: Allows for user to log in using their google gmail account

Collection Database: Lets the Agent or LLM to upload users card into their collection

Scryfall Search: look up cards from scryfall api


After first deliverable goals – What else do you want to support after the first deliverable? Make this be a clear bulleted list of features that we could clearly identify in a final submission: we may add to, subtract from, and hold you accountable for completing things in the list.

Add in the Agent support tool that’s able to pull cards from your collection and also pull unowned cards from the scryfall directory. Add a public Area for people to post their own decks. Implement a better looking collections page that allows for users to select the card art for their respective card ( since user’s uploaded image won’t be saved, I can just pull images form the scryfall )
