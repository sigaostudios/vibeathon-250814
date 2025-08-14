import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NewsChatComponent } from './news-chat/news-chat.component';
import { NewsService } from './services/news.service';
import { NewsAgentService } from './services/news-agent.service';
import { EventBus } from '../game/EventBus';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet, NewsChatComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    title = 'Vibeathon';

    constructor(
        private newsService: NewsService,
        private newsAgentService: NewsAgentService
    ) {}

    ngOnInit() {
        // Initialize services to ensure event listeners are set up
        console.log('AppComponent: News services initialized');
        console.log('AppComponent: NewsService instance:', this.newsService);
        console.log('AppComponent: NewsAgentService instance:', this.newsAgentService);
        
        // Force service initialization by accessing them
        this.newsService.getNews('general').subscribe({
            next: () => console.log('AppComponent: NewsService is working'),
            error: (e) => console.log('AppComponent: NewsService error:', e)
        });
        
        // Test EventBus connectivity from Angular side
        console.log('AppComponent: Testing EventBus from Angular side');
        setTimeout(() => {
            console.log('AppComponent: Emitting test-angular-event');
            EventBus.emit('test-angular-event', { message: 'Hello from Angular!' });
        }, 2000);
    }
}
