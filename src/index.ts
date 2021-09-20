import './style.scss';

import {Collapse as BsCollapse, Modal as BsModal} from 'bootstrap';

const jq = require('jquery');

const collapseFile: JQuery = jq('#collapseFile').first();
const collapseChat: JQuery = jq('#collapseChat').first();
const protocolFileInput: JQuery = jq('#protocolFile');
const chatEmpty: JQuery = jq('#chatEmpty');
const chatView: JQuery = jq('#chatView').hide();
const chatMessages: JQuery = jq('#chatMessages');
const chatUsersOrder: JQuery = jq('#chatUsersOrder');
const chatUsersList: JQuery = jq('#chatUsersList');
const chatEntryTemplate: JQuery = jq('#chatEntryTemplate');
const chatUserTemplate: JQuery = jq('#chatUserTemplate');
const authorSummary: Map<string, AuthorSummary> = new Map<string, AuthorSummary>();
const highlightedAuthors: Array<String> = new Array<String>();
let currentMessage: JQuery = null;
let authorModal: BsModal = null;

declare var __VERSION__: string;
if (__VERSION__) {
    const title: JQuery = jq('head > title');
    title.text(`${title.text()} v${__VERSION__}`);
    console.info(`Running version ${__VERSION__}...`);
}

/**
 * Data structure in JSON file for messages.
 */
interface ChatEntry {
    message: string;
    message_id: string;
    timestamp: number;
    author: ChatAuthor;
    emotes?: Array<ChatEmote>;
}

/**
 * Data structure in JSON file for authors.
 */
interface ChatAuthor {
    id: string;
    name: string;
    images?: Array<ChatImage>;
    badges?: Array<ChatBadge>;
}

/**
 * Data structure in JSON file for badges.
 */
interface ChatBadge {
    title: string;
    icons?: Array<ChatImage>;
}

/**
 * Data structure in JSON file for emotes.
 */
interface ChatEmote {
    id: string;
    name: string;
    is_custom_emoji?: boolean;
    images?: Array<ChatImage>;
}

/**
 * Data structure in JSON file for images.
 */
interface ChatImage {
    id: string;
    url: string;
    height?: number;
    width?: number;
}

/**
 * Chat summary for an author.
 */
class AuthorSummary {
    author: ChatAuthor;
    messageCount: number = 0;
}

/**
 * Show an accordion element.
 * @param collapse Collapsable element to show.
 */
function accordionShow(collapse: JQuery) {
    const div: BsCollapse = BsCollapse.getOrCreateInstance(collapse[0]);
    if (div) {
        div.show();
    } else {
        console.error('Can\'t find collapsable div!');
        console.error(collapse);
    }
}

/**
 * Clear chat view.
 */
function chatDisable(): void {
    highlightedAuthors.splice(0, highlightedAuthors.length);
    currentMessage = null;
    chatView.hide();
    chatMessages.html('');
    chatUsersList.html('');
    authorSummary.clear();
    chatEmpty.show();
    accordionShow(collapseFile);
}

/**
 * Load chat view
 * @param json JSON chat data
 */
function chatLoad(json: string): void {
    let data: Array<ChatEntry>;

    try {
        data = JSON.parse(json) as Array<ChatEntry>;
    } catch (e) {
        chatDisable();
        console.error('Can\'t read JSON!');
        console.error(e);
        return;
    }
    chatEmpty.hide();
    chatView.hide();
    chatMessages.html('');
    authorSummary.clear();

    data.forEach((msg: ChatEntry) => {
        const img: ChatImage = getImage(msg.author.images, 32);
        const entry: JQuery = chatEntryTemplate.clone(false, false)
            .data('id', msg.message_id)
            .data('author', msg.author.id)
            .removeAttr('id')
            .removeClass('d-none');
        const authorImg: JQuery = entry.find('.author-img').first();
        const authorName: JQuery = entry.find('.author-name').first();
        const createdAt: JQuery = entry.find('.created-at').first();
        const message: JQuery = entry.find('.message').first();

        authorImg
            .attr('src', (img != null) ? img.url : './img/unknown.png')
            .on('click', function (event) {
                event.preventDefault();
                authorInfo(msg.author.id);
            });
        authorName.text(msg.author.name);
        createdAt.text(new Date(msg.timestamp / 1000).toLocaleString());

        let text: string = jq('<div>').text(msg.message).text();
        if (msg.emotes) {
            msg.emotes.forEach((emote: ChatEmote) => {
                const emoteName = emote.name;
                const url = emote.images[0].url;
                text = text.split(emoteName).join(`<img class="emote mx-1" src="${url}" alt="${emoteName}" title="${emoteName}">`);
            });
        }
        message.html(text);

        chatMessages.append(entry);

        if (authorSummary.has(msg.author.id)) {
            const summary: AuthorSummary = authorSummary.get(msg.author.id);
            summary.messageCount++;
        } else {
            const summary: AuthorSummary = new AuthorSummary();
            summary.author = msg.author;
            summary.messageCount++;
            authorSummary.set(msg.author.id, summary);
        }
    });

    buildAuthorList();
    accordionShow(collapseChat);
    chatView.fadeIn();
}

/**
 * Build list of authors.
 */
function buildAuthorList() {
    chatUsersList.html('');
    Array.from(authorSummary.values())
        .sort((a: AuthorSummary, b: AuthorSummary): number => {
            const orderBy: string = chatUsersOrder.val() as string;
            if (orderBy == 'messageCount') {
                const diff = b.messageCount - a.messageCount;
                if (diff != 0) return diff;
            }
            return a.author.name.toLocaleLowerCase().localeCompare(b.author.name.toLocaleLowerCase());
        })
        .forEach((summary: AuthorSummary) => {
            const img: ChatImage = getImage(summary.author.images, 32);
            const entry: JQuery = chatUserTemplate.clone(false, false)
                .data('id', summary.author.id)
                .removeAttr('id')
                .removeClass('d-none');
            const authorImg: JQuery = entry.find('.author-img').first();
            const authorName: JQuery = entry.find('.author-name').first();
            const authorHighlighted: JQuery = entry.find('.author-highlighted').first();
            const messageCount: JQuery = entry.find('.message-count').first();


            authorImg
                .attr('src', (img != null) ? img.url : './img/unknown.png')
                .on('click', function (event) {
                    event.preventDefault();
                    authorInfo(summary.author.id);
                });
            authorName
                .text(summary.author.name)
                .on('click', function (event) {
                    event.preventDefault();
                    authorScrollToNextMessage(summary.author.id);
                });
            if (highlightedAuthors.indexOf(summary.author.id) >= 0) {
                authorHighlighted.prop('checked', true);
            }
            authorHighlighted.on('change', function (event) {
                event.preventDefault();
                authorHighlightMessages(summary.author.id, authorHighlighted.is(':checked'))
            });

            messageCount.text(summary.messageCount);

            chatUsersList.append(entry);
        });
}

/**
 * Select an image for a preferred size.
 * @param images array of images
 * @param preferredSize preferred size
 */
function getImage(images: Array<ChatImage>, preferredSize: number): ChatImage {
    let match: ChatImage = null;
    if (!images || images.length < 1) {
        return match;
    }
    images.forEach((image: ChatImage) => {
        if (match == null) {
            match = image;
            return;
        }
        if (image.width && image.width < preferredSize) {
            return;
        }
        if (!match.width && image.width && image.width >= preferredSize) {
            match = image;
            return;
        }
        if (match.width) {
            const diff = preferredSize - match.width;
            if (diff == 0) {
                return;
            }
            if (image.width) {
                const diff1 = preferredSize - image.width;
                if (diff1 < diff) {
                    match = image;
                    return;
                }
            }
        }
    });
    return match;
}

/**
 * Show modal dialog with information about an author.
 * @param authorId author ID
 */
function authorInfo(authorId: string): void {
    if (!authorSummary.has(authorId)) {
        console.error(`Author ${authorId} is unknown!`);
        return;
    }

    const author: ChatAuthor = authorSummary.get(authorId).author;
    const img: ChatImage = getImage(author.images, 150);

    jq('#authorModalId').text(author.id);
    jq('#authorModalLabel').text(author.name);
    jq('#authorModalImage').attr('src', (img != null) ? img.url : './img/unknown.png');

    const authorModalList: JQuery = jq('#authorModalList');
    authorModalList.find('.author-badge').remove();

    if (author.badges) {
        author.badges.forEach((badge: ChatBadge) => {
            const item: JQuery = jq('<div>')
                .addClass('author-badge')
                .addClass('list-group-item');

            const icon: ChatImage = getImage(badge.icons, 25);
            if (icon == null) {
                item.text(badge.title);
            } else {
                item.append(jq('<div>')
                    .addClass('d-flex')
                    .addClass('flex-row')
                    .addClass('align-items-center')
                    .append(jq('<div>')
                        .addClass('me-2')
                        .text(badge.title))
                    .append(jq('<img src="#" alt="">')
                        .attr('src', icon.url)
                    )
                );
            }

            authorModalList.append(item);
        });
    }

    authorModal = new BsModal(jq('#authorModal')[0]);
    authorModal.show();
}

/**
 * Highlight messages of an author.
 * @param authorId author ID
 * @param highlighted true to enable highlighting for the author, false to disable highlighting for the author
 */
function authorHighlightMessages(authorId: string, highlighted: boolean): void {
    const index = highlightedAuthors.indexOf(authorId);
    const authorMessages: JQuery = jq('.chat-entry').filter((index: number, element: HTMLElement): boolean => {
        return jq(element).data('author') == authorId;
    });

    if (highlighted) {
        authorMessages.addClass('list-group-item-warning');
        if (index < 0) {
            highlightedAuthors.push(authorId);
        }
    } else {
        authorMessages.removeClass('list-group-item-warning');
        if (index >= 0) {
            delete highlightedAuthors[index];
        }
    }
}

/**
 * Scroll to the next message of an author.
 * @param authorId author ID
 */
function authorScrollToNextMessage(authorId: string): void {
    let currentMessageId: string = null;

    if (currentMessage) {
        currentMessage.removeClass('list-group-item-danger');
        if (currentMessage.data('author') == authorId) {
            currentMessageId = currentMessage.data('id');
        }
    }

    const authorMessages: JQuery = jq('.chat-entry').filter((index: number, element: HTMLElement): boolean => {
        return jq(element).data('author') == authorId;
    });
    if (authorMessages.length < 1) {
        //console.error(`No messages found for author ${authorId}!`);
        return;
    }

    let nextAuthorMessage: JQuery;
    if (!currentMessageId) {
        //console.info(`Select first message for author ${authorId}.`);
        nextAuthorMessage = authorMessages.first();
    } else {
        //console.info(`Search for following message after ${currentMessageId} by author ${authorId}.`);
        let currentMessageReached: boolean = false;
        nextAuthorMessage = authorMessages.filter((index: number, element: HTMLElement): boolean => {
            const msg: JQuery = jq(element);
            const msgId: string = msg.data('id');
            if (currentMessageReached) {
                return true;
            }
            if (msgId == currentMessageId) {
                currentMessageReached = true;
            }
            return false;
        }).first();
        if (nextAuthorMessage.length < 1) {
            //console.info(`No following message found author ${authorId}.`);
            nextAuthorMessage = authorMessages.first();
        }
    }

    currentMessage = nextAuthorMessage
        .addClass('list-group-item-danger');

    //const position = chatMessages.scrollTop() + currentMessage.position().top;
    const position = chatMessages.scrollTop() + currentMessage.position().top
        - (chatMessages.height() / 2) + (currentMessage.height() / 2);

    chatMessages.animate({
        scrollTop: position
    }, 1000, 'swing');
}

/**
 * Load chat view, if a local file was selected.
 */
protocolFileInput.on('change', function (event) {
    event.preventDefault();
    //console.debug('File changed.');

    const input: HTMLInputElement = protocolFileInput[0] as HTMLInputElement;
    if (input.files == null) {
        console.debug('No file selected.');
        chatDisable();
        return;
    }

    const file: File = input.files.item(0);
    const reader: FileReader = new FileReader();
    reader.onload = function () {
        //console.debug('onload');
        //console.info(reader.result);
        chatLoad(reader.result as string);
    };
    reader.onerror = function () {
        //console.debug('onerror');
        console.error('Error while reading file.');
        console.error(reader.error);
        chatDisable();
    };
    reader.readAsText(file, 'UTF-8');
});

/**
 * Change order of authors.
 */
chatUsersOrder.on('change', function (event) {
    event.preventDefault();
    buildAuthorList();
});
