class Messages {

    attach = function (context) {
        const element = context.querySelector('.messages');
        element.style.backgroundColor = 'red';
    };
}

registerComponent('messages', new Messages());
