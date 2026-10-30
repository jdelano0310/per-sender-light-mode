# per-sender-light-mode
A thunderbird add-on that remembers which email address you've want to view in light mode (when your system theme is dark mode)

I always use dark mode and 99% of the email bodies render well enough, but there are some that don't and I always have to 
flip the mode switch at the email header (which is system wide and not per sender).

I took to Claude to create a simple add-on (for use while you're using dark mode) that saves which sender email addresses
you switch to light mode. This will then auto flip to light mode any time an email from them is displayed.

It also modifies the slider switch area to say "Auto" with a tooltip explaining why / how the email is displayed in light mode.
Just incase :-)

This only reads the message sender and storage of which emails should use light mode are kept local.

EDIT: I am a developer, yes really since the late 1980s, using Claude was just faster. I realize it might not create the "best case" code
this is why I selected a license that allows you to do whatever you want with this.
