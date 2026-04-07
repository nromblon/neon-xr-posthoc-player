import React from "react";

import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { InputGroup, InputGroupInput } from "../ui/input-group";
import { SearchIcon } from "lucide-react";

export const EventsTimeline : React.FC = () => {
    const tags = [
        "Tag 1",
        "Tag 2",
        "Tag 3",
        "Tag 4",
        "Tag 5",
        "Tag 6",
        "Tag 7",
        "Tag 8",
        "Tag 9",
        "Tag 10",
    ];

    return (
    <ScrollArea className="h-72 min-w-48 sticky rounded-md border">
      <div id="events-timeline-header" className="flex-row justify-between inline-flex w-full mb-0 px-4 pt-4 sticky top-0 bg-background z-10">
        <div id="events-timeline-start-div" className="flex-row inline">
            <h4 className="text-sm leading-none font-medium inline"> Events </h4>
          <Button variant="outline" size="sm" className="ml-4 text-xs text-foreground">
            + Add Event
          </Button>
        </div>
          <div id="events-timeline-end-div" className="flex-row flex-wrap inline">
        <InputGroup className="w-40" >
          <SearchIcon className="size-4 ml-2 text-muted-foreground" />
          <InputGroupInput placeholder="Search events..." className="text-xs" />
        </InputGroup>
      </div>
    </div>
      <div className="px-4 py-2">
        <div className="flex flex-col gap-2">
        {tags.map((tag) => (
          <React.Fragment key={tag}>
            <div className="text-sm">{tag}</div>
            <Separator className="my-2" />
          </React.Fragment>
        ))}
        </div>
      </div>
    </ScrollArea>
    );
}