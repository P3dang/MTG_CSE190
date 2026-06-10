## Pre-review by Phuoc Dang, A17291649
## Review of Chenrui Liu

### 1. Project summary/implementation

#### a. Summary
This is a run-it-locally project. The intended users are researchers or people that are looking for research papers for any categories. This app searches for research papers on whatever topics you ask it. There is also a feature for a bib and to download the pdfs. 

#### b. Demo attempt
I was able to follow the demo guide to download the application, and downloaded Ollama ( qwen3.5:2b ) to my laptop. While attempting to search for a research paper on league of legends, the agent took a while to respond and unfortunately failed to deliver. On my search attempt I had reach the max "Max turns (10) exceeded" turn. This could be that qwen3.5:2b is a weak model and couldn't handle to load. 

<img width="648" height="297" alt="Image" src="https://github.com/user-attachments/assets/220d6d61-47fb-475c-b25b-6e586291b227" />

I'm not to sure if I had to install other dependencies to get this running. 

#### c. Proposal component check
Application Backend: Implemented as written ```paper_research/web_api.py```
Model Configuration Layer: Implemented as written ``` paper_research/web_api.py``` & ```paper_research/config.py```
Browser UI: Implemented differently ```paper_research/web/```
Packaging / Installer: ```paper_research/launcher.py```, ```BUILD_DMG.md```, ```dist/Paper Research Agent.dmg```

#### d. One confusing thing
The setup is a little confusing, I tried using the application download and my mac gave me some errors. I had claude help me clear some restrictions before I was able to run the application. 

#### e. A conversation starter for Tuesday
Can you demo the searching part using the Ollama provided in the write-up 

### 2. Suggestions

#### a. Scope feedback for the final deliverable
I think you should prioritize in finding and testing different Ollama models. While I did get the agent running, the model provided in the right up seems to not be working or is too weak for searching through research papers. 

#### b. One concrete suggestion
I think finding a way to have default setting that would work the second a user installs the app. Like a weak but default LLM that comes included with the installation. 

#### c. Something you learned or thought was cool
_Call out one specific thing from this project you learned from or genuinely
enjoyed — a technique, a design decision, a clever prompt, a tool or library you
hadn't seen. Be concrete about what it was and why it stuck with you._

I didn't know that there was api that can access all the research papers.

___________________

## Pre-review by Phuoc Dang, A17291649
## Review of Rosario

### 1. Project summary/implementation

#### a. Summary
This project is under the run it locally web app, and is intended for people who have large collections of yarn. This tool is able to scan yarn labels and store it inside a large database. In which users can filter through and sort for specific yarn. 

#### b. Demo attempt
I followed the DEMO.md steps but could not get the app running. The build script (build.py) fails with HTTP Error 401: Unauthorized when trying to download the model files (Qwen3VL-4B-Instruct-Q4_K_M.gguf and mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf) from Hugging Face, because the repo requires authentication but the script uses urllib which doesn't support Hugging Face tokens. I manually downloaded the first file and renamed it to match the expected filename (Qwen3VL instead of Qwen3-VL), but the second file also failed the same way. The fix would be to either make the models publicly accessible, include download instructions for manual setup, or use the huggingface_hub library which supports token authentication.

#### c. Proposal component check
UI: ```app.py```, ```templates/collection.html```, ```templates/yarn_detail.html```
Image Storage: ```app.py```
classification: ```extract.py```
Authentication: ```app.py```
Still planning: Inbox-style async UI and Bulk uploads

#### d. One confusing thing
extract.py has two separate APIs that do the same thing: a class-based API (LiteLLMExtractor, OllamaExtractor, LlamaCppExtractor) and a functional API (extract_yarn, extract_yarn_with_usage, extract_yarn_batch). The web app calls the functional one, the packaged build uses the class-based one, and the functional API is itself just a thin wrapper around the class. It took reading both halves of the file to understand they overlap.

#### e. A conversation starter for Tuesday
Can you show me how to get the application to run on my laptop

### 2. Suggestions

#### a. Scope feedback for the final deliverable
I think all of the features proposed in the after first deliverable are all relevant and is manageable for the final submission


#### b. One concrete suggestion
Add a "mark all fields as verified" button on the yarn detail page. Right now the correction loop only improves future extractions when a user manually edits and saves a yarn. But if the extraction was correct, users have no way to mark it as verified without making a fake edit. The get_verified_yarns() function in db.py feeds few-shot examples back into the model, so yarns that were correctly extracted but never edited never contribute to improving future results — even if the user checked them and they were right.

#### c. Something you learned or thought was cool
_Call out one specific thing from this project you learned from or genuinely
enjoyed — a technique, a design decision, a clever prompt, a tool or library you
hadn't seen. Be concrete about what it was and why it stuck with you._
